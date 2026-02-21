import logging
from contextlib import contextmanager

import psycopg2
import psycopg2.extras
from pgvector.psycopg2 import register_vector

from .config import settings

logger = logging.getLogger(__name__)

_pool = None


def get_connection():
    """Get a database connection with pgvector support."""
    conn = psycopg2.connect(settings.database_url)
    register_vector(conn)
    return conn


@contextmanager
def get_cursor():
    """Context manager for database cursor with auto-commit."""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            yield cur
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_schema():
    """Initialize pgvector extension and user_embeddings table."""
    dim = settings.embedding_dimensions
    with get_cursor() as cur:
        cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
        cur.execute(f"""
            CREATE TABLE IF NOT EXISTS user_embeddings (
                user_id UUID PRIMARY KEY,
                embedding vector({dim}),
                model_version VARCHAR(20) DEFAULT 'v1.0',
                updated_at TIMESTAMP DEFAULT now()
            )
        """)
        # ivfflat index for fast cosine similarity search
        cur.execute(f"""
            CREATE INDEX IF NOT EXISTS idx_embedding_vector
            ON user_embeddings
            USING ivfflat (embedding vector_cosine_ops)
            WITH (lists = 100)
        """)
    logger.info("Database schema initialized (pgvector + user_embeddings)")


def get_embedding_count() -> int:
    """Get total number of user embeddings."""
    with get_cursor() as cur:
        cur.execute("SELECT COUNT(*) as cnt FROM user_embeddings")
        row = cur.fetchone()
        return row["cnt"] if row else 0


def get_last_update():
    """Get the most recent embedding update timestamp."""
    with get_cursor() as cur:
        cur.execute("SELECT MAX(updated_at) as last FROM user_embeddings")
        row = cur.fetchone()
        return row["last"] if row else None
