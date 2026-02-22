import logging
from contextlib import asynccontextmanager

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import FastAPI, HTTPException

from .config import settings
from .database import get_embedding_count, get_last_update, init_schema
from .engine import (
    MODEL_VERSION,
    get_recommendations,
    train_embeddings,
    update_single_embedding,
)
from .kafka_consumer import start_consumer, stop_consumer
from .models import (
    BatchUpdateResponse,
    HealthResponse,
    RecommendationItem,
    RecommendResponse,
    UpdateEmbeddingRequest,
)
from .redis_client import (
    cache_recommendations,
    get_cached_recommendations,
    invalidate_all_recs,
)

logging.basicConfig(
    level=getattr(logging, settings.log_level.upper(), logging.INFO),
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
)
logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler()


def _scheduled_train():
    """Run scheduled batch training and invalidate caches."""
    try:
        count, duration = train_embeddings()
        if count > 0:
            invalidate_all_recs()
        logger.info(f"Scheduled training done: {count} embeddings in {duration:.1f}s")
    except Exception as e:
        logger.error(f"Scheduled training failed: {e}")


@asynccontextmanager
async def lifespan(_app: FastAPI):
    # Startup
    logger.info("Initializing recommendation-ml service...")
    init_schema()

    # Auto-train on startup if no embeddings exist
    try:
        count = get_embedding_count()
        if count == 0:
            logger.info("No embeddings found — running initial training...")
            trained, duration = train_embeddings()
            logger.info(f"Initial training complete: {trained} embeddings in {duration:.1f}s")
        else:
            logger.info(f"Found {count} existing embeddings, skipping initial training")
    except Exception as e:
        logger.error(f"Auto-train on startup failed: {e}")

    # Schedule nightly batch training
    scheduler.add_job(
        _scheduled_train,
        "cron",
        hour=settings.model_update_cron_hour,
        id="batch_train",
    )
    scheduler.start()

    # Start Kafka consumer
    start_consumer()

    logger.info(f"Service started on port {settings.port}")
    yield

    # Shutdown
    scheduler.shutdown(wait=False)
    stop_consumer()
    logger.info("Service stopped")


app = FastAPI(
    title="Recommendation ML Service",
    version=MODEL_VERSION,
    lifespan=lifespan,
)


# ------------------------------------------------------------------
# API compatible with MlClientService (matching-service)
# POST /recommendations  → MlRecommendation[] = [{userId, score}]
# GET  /health           → HealthResponse
# ------------------------------------------------------------------


@app.post("/recommendations")
async def recommend(body: dict):
    """
    ML recommendation endpoint.
    Accepts {userId, limit, excludeIds} and returns [{userId, score}].
    """
    user_id = body.get("userId")
    if not user_id:
        raise HTTPException(status_code=400, detail="userId is required")

    limit = body.get("limit", 50)
    exclude_ids = body.get("excludeIds", [])

    # Check cache
    cached = get_cached_recommendations(user_id)
    if cached:
        exclude_set = set(exclude_ids)
        filtered = [r for r in cached if r["user_id"] not in exclude_set]
        return [
            {"userId": r["user_id"], "score": r["score"]}
            for r in filtered[:limit]
        ]

    # Compute recommendations
    recs = get_recommendations(user_id, limit=limit + 20, exclude_ids=exclude_ids)

    if recs:
        cache_recommendations(user_id, recs)

    # Return in MlClientService-compatible format
    return [
        {"userId": r["user_id"], "score": r["score"]}
        for r in recs[:limit]
    ]


@app.get("/health")
async def health():
    """Health check endpoint."""
    count = get_embedding_count()
    last = get_last_update()
    return HealthResponse(
        status="ok",
        model_version=MODEL_VERSION,
        embedding_count=count,
        last_update=last,
    )


@app.post("/update-embedding")
async def update_embedding(req: UpdateEmbeddingRequest):
    """Incrementally update a single user's embedding."""
    ok = update_single_embedding(req.user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="User not found")
    return {"status": "updated", "user_id": req.user_id}


@app.post("/batch-update")
async def batch_update():
    """Trigger full batch retraining of all embeddings."""
    count, duration = train_embeddings()
    if count > 0:
        invalidate_all_recs()
    return BatchUpdateResponse(
        updated_count=count,
        duration_seconds=round(duration, 2),
        model_version=MODEL_VERSION,
    )


# Structured recommend endpoint (typed)
@app.post("/recommend", response_model=RecommendResponse)
async def recommend_typed(body: dict):
    """Typed recommendation endpoint returning RecommendResponse."""
    user_id = body.get("userId") or body.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="userId is required")

    limit = body.get("limit", 50)
    exclude_ids = body.get("excludeIds") or body.get("exclude_ids") or []

    recs = get_recommendations(user_id, limit=limit, exclude_ids=exclude_ids)
    return RecommendResponse(
        recommendations=[
            RecommendationItem(user_id=r["user_id"], score=r["score"])
            for r in recs
        ]
    )
