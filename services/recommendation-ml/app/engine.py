import logging
import time
from datetime import datetime, timedelta, timezone

import numpy as np
from scipy.sparse import csr_matrix
from sklearn.decomposition import TruncatedSVD

from .config import settings
from .database import get_cursor

logger = logging.getLogger(__name__)

MODEL_VERSION = "v1.0"

# Interaction signal weights
SIGNAL_WEIGHTS = {
    "like": 1.0,
    "super_like": 2.0,
    "pass": -0.3,
    "view_detail": 0.3,
    "view_photo": 0.2,
    "dwell_card": 0.1,
    "dwell_detail": 0.4,
}

DIM = settings.embedding_dimensions
LATENT_DIM = 64  # latent dimensions from matrix factorization


def _build_interaction_matrix() -> tuple[csr_matrix, list[str], list[str]]:
    """
    Build user-user interaction matrix from behavior events + swipes.
    Returns (sparse_matrix, row_user_ids, col_user_ids).
    """
    since = datetime.now(timezone.utc) - timedelta(days=30)

    with get_cursor() as cur:
        # Get swipe interactions
        cur.execute("""
            SELECT "swiperId", "swipedId", action
            FROM swipes
            WHERE "createdAt" > %s
        """, (since,))
        swipe_rows = cur.fetchall()

        # Get behavior events (view, dwell, etc.) — graceful fallback if table missing
        behavior_rows = []
        try:
            cur.execute("""
                SELECT "userId", "targetUserId", "eventType",
                       COALESCE((metadata->>'weight')::float, 1.0) as weight
                FROM user_behavior_events
                WHERE "createdAt" > %s AND "targetUserId" IS NOT NULL
            """, (since,))
            behavior_rows = cur.fetchall()
        except Exception as e:
            logger.warning(f"user_behavior_events query failed (table may not exist): {e}")
            # Rollback the failed transaction so cursor remains usable
            cur.execute("ROLLBACK")
            cur.execute("BEGIN")

    # Collect all unique user IDs
    user_set = set()
    interactions: list[tuple[str, str, float]] = []

    for row in swipe_rows:
        swiper = row["swiperId"]
        swiped = row["swipedId"]
        action = row["action"]
        signal = SIGNAL_WEIGHTS.get(action, 0)
        if signal != 0:
            user_set.add(swiper)
            user_set.add(swiped)
            interactions.append((swiper, swiped, signal))

    for row in behavior_rows:
        uid = row["userId"]
        tid = row["targetUserId"]
        etype = row["eventType"]
        weight = row["weight"]
        signal = SIGNAL_WEIGHTS.get(etype, 0.1) * weight
        if signal != 0:
            user_set.add(uid)
            user_set.add(tid)
            interactions.append((uid, tid, signal))

    if not user_set:
        return csr_matrix((0, 0)), [], []

    user_list = sorted(user_set)
    user_idx = {uid: i for i, uid in enumerate(user_list)}
    n = len(user_list)

    rows, cols, data = [], [], []
    for src, dst, val in interactions:
        rows.append(user_idx[src])
        cols.append(user_idx[dst])
        data.append(val)

    matrix = csr_matrix((data, (rows, cols)), shape=(n, n))
    return matrix, user_list, user_list


def _build_user_features(user_ids: list[str]) -> dict[str, np.ndarray]:
    """
    Build explicit feature vectors for users.
    Combines demographic (8d) + tag (40d) + engagement (20d) = 68d explicit features.
    The remaining dimensions come from collaborative filtering latent factors.
    """
    explicit_dim = DIM - LATENT_DIM  # 64 explicit features
    features = {}

    with get_cursor() as cur:
        # Batch fetch user demographics
        cur.execute("""
            SELECT id, "userType", "birthDate",
                   "verificationStatus", "createdAt"
            FROM users
            WHERE id = ANY(%s)
        """, (user_ids,))
        user_rows = {str(r["id"]): r for r in cur.fetchall()}

        # Batch fetch user tags
        cur.execute("""
            SELECT uit."userId", it.category, it.name, it.id as tag_id
            FROM user_interest_tags uit
            JOIN interest_tags it ON uit."tagId" = it.id
            WHERE uit."userId" = ANY(%s)
        """, (user_ids,))
        tag_rows = cur.fetchall()

    # Group tags by user
    user_tags: dict[str, list[dict]] = {}
    for row in tag_rows:
        uid = str(row["userId"])
        user_tags.setdefault(uid, []).append(row)

    # Category index for tag encoding
    categories = ["lifestyle", "interests", "expectations", "personality"]
    cat_idx = {c: i for i, c in enumerate(categories)}

    for uid in user_ids:
        vec = np.zeros(explicit_dim, dtype=np.float32)

        # Demographic features (0-7): 8 dimensions
        urow = user_rows.get(uid)
        if urow:
            # User type one-hot (0-1)
            if urow["userType"] == "sugar_daddy":
                vec[0] = 1.0
            elif urow["userType"] == "sugar_baby":
                vec[1] = 1.0

            # Age normalized (2)
            if urow.get("birthDate"):
                age = (datetime.now().date() - urow["birthDate"]).days / 365.25
                vec[2] = np.clip(age / 80.0, 0, 1)

            # Verification (3)
            if urow.get("verificationStatus") == "verified":
                vec[3] = 1.0

            # Account age normalized (4)
            if urow.get("createdAt"):
                days = (datetime.now(timezone.utc) - urow["createdAt"].replace(tzinfo=timezone.utc)).days
                vec[4] = np.clip(days / 365.0, 0, 1)

        # Tag features (8-47): 40 dimensions (4 categories x 10 slots)
        tags = user_tags.get(uid, [])
        for tag in tags:
            ci = cat_idx.get(tag["category"], 0)
            base = 8 + ci * 10
            # Hash tag name to a slot within the category's 10 dimensions
            slot = hash(tag["name"]) % 10
            vec[base + slot] = 1.0

        # Engagement features (48-63): 16 dimensions
        # These are computed from aggregate stats
        tag_count = len(tags)
        vec[48] = np.clip(tag_count / 20.0, 0, 1)  # tag completeness

        features[uid] = vec

    return features


def train_embeddings() -> tuple[int, float]:
    """
    Train user embeddings using matrix factorization + explicit features.
    Returns (updated_count, duration_seconds).
    """
    start = time.time()
    logger.info("Starting embedding training...")

    # Step 1: Build interaction matrix
    matrix, row_users, col_users = _build_interaction_matrix()
    n_users = len(row_users)

    if n_users < settings.min_interactions_for_training:
        logger.warning(f"Not enough users for training: {n_users}")
        return 0, time.time() - start

    logger.info(f"Interaction matrix: {matrix.shape}, nnz={matrix.nnz}")

    # Step 2: Matrix factorization → latent factors
    n_components = min(LATENT_DIM, n_users - 1, matrix.shape[1] - 1)
    if n_components < 2:
        logger.warning("Not enough data for SVD decomposition")
        return 0, time.time() - start

    svd = TruncatedSVD(n_components=n_components, random_state=42)
    latent_factors = svd.fit_transform(matrix)  # shape: (n_users, n_components)

    # Pad to LATENT_DIM if n_components < LATENT_DIM
    if n_components < LATENT_DIM:
        padding = np.zeros((n_users, LATENT_DIM - n_components), dtype=np.float32)
        latent_factors = np.hstack([latent_factors, padding])

    logger.info(f"SVD explained variance ratio sum: {svd.explained_variance_ratio_.sum():.3f}")

    # Step 3: Build explicit features
    explicit_features = _build_user_features(row_users)

    # Step 4: Concatenate latent + explicit → 128d embedding
    embeddings = {}
    explicit_dim = DIM - LATENT_DIM
    for i, uid in enumerate(row_users):
        latent = latent_factors[i].astype(np.float32)
        explicit = explicit_features.get(uid, np.zeros(explicit_dim, dtype=np.float32))
        combined = np.concatenate([latent, explicit])
        # L2 normalize for cosine similarity
        norm = np.linalg.norm(combined)
        if norm > 0:
            combined = combined / norm
        embeddings[uid] = combined

    # Step 5: Upsert embeddings to PostgreSQL
    with get_cursor() as cur:
        for uid, emb in embeddings.items():
            cur.execute("""
                INSERT INTO user_embeddings (user_id, embedding, model_version, updated_at)
                VALUES (%s, %s, %s, now())
                ON CONFLICT (user_id)
                DO UPDATE SET embedding = EXCLUDED.embedding,
                             model_version = EXCLUDED.model_version,
                             updated_at = now()
            """, (uid, emb.tolist(), MODEL_VERSION))

    duration = time.time() - start
    logger.info(f"Training complete: {len(embeddings)} embeddings in {duration:.1f}s")
    return len(embeddings), duration


def get_recommendations(
    user_id: str,
    limit: int = 50,
    exclude_ids: list[str] | None = None,
) -> list[dict]:
    """
    Get top-N recommendations using pgvector cosine similarity.
    Returns list of {user_id, score}.
    """
    exclude_ids = exclude_ids or []

    with get_cursor() as cur:
        # Get user's embedding
        cur.execute(
            "SELECT embedding FROM user_embeddings WHERE user_id = %s",
            (user_id,),
        )
        row = cur.fetchone()
        if not row:
            logger.debug(f"No embedding found for user {user_id}")
            return []

        user_embedding = row["embedding"]

        # k-NN search using pgvector cosine distance
        # 1 - cosine_distance = cosine_similarity
        # Fetch more than limit to account for excludes
        fetch_limit = limit + len(exclude_ids) + 20

        if exclude_ids:
            cur.execute("""
                SELECT user_id,
                       1 - (embedding <=> %s) as similarity
                FROM user_embeddings
                WHERE user_id != %s
                  AND user_id != ALL(%s)
                ORDER BY embedding <=> %s
                LIMIT %s
            """, (user_embedding, user_id, exclude_ids, user_embedding, fetch_limit))
        else:
            cur.execute("""
                SELECT user_id,
                       1 - (embedding <=> %s) as similarity
                FROM user_embeddings
                WHERE user_id != %s
                ORDER BY embedding <=> %s
                LIMIT %s
            """, (user_embedding, user_id, user_embedding, limit))

        results = cur.fetchall()

    # Normalize scores to 0-1 range
    recs = []
    for row in results[:limit]:
        score = max(0.0, min(1.0, (row["similarity"] + 1) / 2))
        recs.append({
            "user_id": str(row["user_id"]),
            "score": round(score, 4),
        })

    return recs


def update_single_embedding(user_id: str) -> bool:
    """
    Update embedding for a single user (incremental).
    Uses existing model — just recomputes their explicit features
    and stores with latest latent factors if available.
    """
    features = _build_user_features([user_id])
    if user_id not in features:
        return False

    explicit = features[user_id]
    explicit_dim = DIM - LATENT_DIM

    # Check if user has existing embedding (use latent part)
    with get_cursor() as cur:
        cur.execute(
            "SELECT embedding FROM user_embeddings WHERE user_id = %s",
            (user_id,),
        )
        row = cur.fetchone()

    if row:
        # Keep existing latent part, update explicit part
        old_emb = np.array(row["embedding"], dtype=np.float32)
        latent = old_emb[:LATENT_DIM]
        combined = np.concatenate([latent, explicit])
    else:
        # No latent factors yet — use zeros + explicit features
        latent = np.zeros(LATENT_DIM, dtype=np.float32)
        combined = np.concatenate([latent, explicit])

    # L2 normalize
    norm = np.linalg.norm(combined)
    if norm > 0:
        combined = combined / norm

    with get_cursor() as cur:
        cur.execute("""
            INSERT INTO user_embeddings (user_id, embedding, model_version, updated_at)
            VALUES (%s, %s, %s, now())
            ON CONFLICT (user_id)
            DO UPDATE SET embedding = EXCLUDED.embedding, updated_at = now()
        """, (user_id, combined.tolist(), MODEL_VERSION))

    return True
