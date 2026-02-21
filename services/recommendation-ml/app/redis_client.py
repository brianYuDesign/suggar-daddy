import json
import logging
from typing import Optional

import redis

from .config import settings

logger = logging.getLogger(__name__)

_client: Optional[redis.Redis] = None


def get_redis() -> redis.Redis:
    """Get Redis client singleton."""
    global _client
    if _client is None:
        _client = redis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=5,
            socket_keepalive=True,
        )
    return _client


def cache_recommendations(user_id: str, recs: list[dict], ttl: int = 0):
    """Cache recommendation results in Redis."""
    ttl = ttl or settings.ml_recs_cache_ttl
    key = f"ml_recs:{user_id}"
    r = get_redis()
    r.set(key, json.dumps(recs), ex=ttl)


def get_cached_recommendations(user_id: str) -> Optional[list[dict]]:
    """Get cached recommendations from Redis."""
    key = f"ml_recs:{user_id}"
    r = get_redis()
    raw = r.get(key)
    if raw:
        return json.loads(raw)
    return None


def invalidate_all_recs():
    """Invalidate all ML recommendation caches after batch update."""
    r = get_redis()
    cursor = 0
    deleted = 0
    while True:
        cursor, keys = r.scan(cursor, match="ml_recs:*", count=500)
        if keys:
            r.delete(*keys)
            deleted += len(keys)
        if cursor == 0:
            break
    logger.info(f"Invalidated {deleted} ML recommendation caches")
    return deleted
