import redis
import os
import logging
from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)

# Create Redis client
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    decode_responses=True
)

# Define the same cache prefixes as in Node.js for consistency
CACHE_KEYS = {
    "USER_DATA": "userdata:",
    "PREFERENCES": "preferences:",
    "STORE_PREFERENCES": "prefs:"
}

async def invalidate_cache(key: str) -> bool:
    """
    Invalidate a cache entry by setting a short expiration
    """
    try:
        # Use a 1 second TTL for invalidation like in Node.js
        redis_client.expire(key, 1)
        logger.info(f"Invalidated cache: {key}")
        return True
    except Exception as e:
        logger.error(f"Error invalidating cache {key}: {e}")
        return False

async def ping_redis() -> bool:
    """
    Check if Redis is connected and responding
    """
    try:
        # Use a simple ping command to check connection
        response = redis_client.ping()
        return response == True
    except Exception as e:
        logger.error(f"Redis ping error: {str(e)}")
        return False