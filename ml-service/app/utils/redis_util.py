import redis
import os
import json
import logging
from app.core.config import settings
from app.core.cache_constants import CACHE_DURATIONS

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
    "STORE_PREFERENCES": "prefs:",
    "AI_REQUEST": "ai_request:",
    "TAXONOMY_TREE": "taxonomy:tree:",
    "TAXONOMY_ATTRIBUTES": "taxonomy:attrs:",
    "TAXONOMY_SEARCH": "taxonomy:search:",
    "TAXONOMY_EMBEDDINGS": "taxonomy:embeddings:",
    "PRICE_RANGES": "taxonomy:prices:",
    "SCHEMA_PROPS": "schema:props:",
}

# Define standard TTL values matching Node.js values
CACHE_TTL = {
    "TOKEN": 3600,  # Regular tokens - 1 hour
    "USER_DATA": 3600,  # User profiles - 1 hour
    "STORE_DATA": 3600,  # Store profiles - 1 hour
    "API_KEY": 1800,  # API keys - 30 minutes
    "INVALIDATION": 1,  # Short TTL for invalidation
    "AI_REQUEST": 60,  # AI service requests - 1 minute
    "TAXONOMY": CACHE_DURATIONS["MEDIUM"],
    "TAXONOMY_ATTRIBUTES": CACHE_DURATIONS["MEDIUM"],
    "TAXONOMY_SEARCH": CACHE_DURATIONS["SHORT"],
    "TAXONOMY_EMBEDDINGS": CACHE_DURATIONS["LONG"],
    "PRICE_RANGES": CACHE_DURATIONS["MEDIUM"],
    "SCHEMA": CACHE_DURATIONS["MEDIUM"],
}

async def connect_redis():
    """
    Connect to Redis server (should be called during application startup)
    """
    try:
        redis_client.ping()
        logger.info("Connected to Redis")
        return True
    except Exception as e:
        logger.error(f"Redis connection error: {e}")
        return False

async def ensure_connection():
    """
    Ensures Redis is connected before operations
    """
    return await connect_redis()

async def get_cache(key: str):
    """
    Get value from cache
    """
    try:
        value = redis_client.get(key)
        if value:
            logger.debug(f"Cache hit: {key}")
            return value
        logger.debug(f"Cache miss: {key}")
        return None
    except Exception as e:
        logger.error(f"Error getting cache {key}: {e}")
        return None

async def set_cache(key: str, value: str, options: dict = None):
    """
    Set value in cache with options
    """
    try:
        if not await ensure_connection():
            return False
            
        if options is None:
            options = {}
        
        # Handle expiration time
        ex = options.get("EX", None)
        
        if ex:
            redis_client.set(key, value, ex=ex)
        else:
            redis_client.set(key, value)
            
        logger.debug(f"Cache set: {key}")
        return True
    except Exception as e:
        logger.error(f"Error setting cache {key}: {e}")
        return False

async def invalidate_cache(key: str) -> bool:
    """
    Invalidate a cache entry by setting a short expiration (matches Node.js approach)
    """
    try:
        if not await ensure_connection():
            return False
            
        # Match Node.js approach: set with empty value and short TTL
        await set_cache(key, "", {"EX": CACHE_TTL["INVALIDATION"]})
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