import redis
import os
import json
import logging
from app.core.config import settings

# Configure logging
logger = logging.getLogger(__name__)

# Environment-specific prefix to isolate cache entries
ENVIRONMENT_PREFIX = f"{settings.ENVIRONMENT}:" if hasattr(settings, 'ENVIRONMENT') else ""

# Cache durations in seconds (moved from cache_constants.py)
CACHE_DURATIONS = {
    "SHORT": 300,           # 5 minutes
    "MEDIUM": 3600,         # 1 hour
    "LONG": 86400,          # 1 day
    "VERY_LONG": 604800     # 1 week
}

# Create Redis client with connection pooling
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    decode_responses=True,
    max_connections=10,  # Limit connection pool
    socket_timeout=2.0,  # Add timeouts
    socket_connect_timeout=1.0
)

# Define the same cache prefixes as in Node.js for consistency
CACHE_KEYS = {
    "USER_DATA": "userdata:",
    "PREFERENCES": "preferences:",
    "STORE_PREFERENCES": "prefs:",
    "AI_REQUEST": "ai_request:",
    "TAXONOMY_SEARCH": "taxonomy:search:",
    "TAXONOMY_EMBEDDINGS": "taxonomy:embeddings:",
}

# Define standard TTL values matching Node.js values
CACHE_TTL = {
    "TOKEN": 3600,  # Regular tokens - 1 hour
    "USER_DATA": 3600,  # User profiles - 1 hour
    "STORE_DATA": 3600,  # Store profiles - 1 hour
    "API_KEY": 1800,  # API keys - 30 minutes
    "INVALIDATION": 1,  # Short TTL for invalidation
    "AI_REQUEST": 60,  # AI service requests - 1 minute
    "TAXONOMY_SEARCH": CACHE_DURATIONS["SHORT"],  # Now using CACHE_DURATIONS directly
    "TAXONOMY_EMBEDDINGS": CACHE_DURATIONS["LONG"],
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
    prefixed_key = ENVIRONMENT_PREFIX + key
    try:
        value = redis_client.get(prefixed_key)
        if value:
            logger.debug(f"Cache hit: {prefixed_key}")
            return value
        logger.debug(f"Cache miss: {prefixed_key}")
        return None
    except Exception as e:
        logger.error(f"Error getting cache {prefixed_key}: {e}")
        return None

async def set_cache(key: str, value: str, options: dict = None):
    """
    Set value in cache with options
    """
    prefixed_key = ENVIRONMENT_PREFIX + key
    try:
        if not await ensure_connection():
            return False
            
        if options is None:
            options = {}
        
        # Handle expiration time
        ex = options.get("EX", None)
        
        if ex:
            redis_client.set(prefixed_key, value, ex=ex)
        else:
            redis_client.set(prefixed_key, value)
            
        logger.debug(f"Cache set: {prefixed_key}")
        return True
    except Exception as e:
        logger.error(f"Error setting cache {prefixed_key}: {e}")
        return False

async def invalidate_cache(key: str) -> bool:
    """
    Invalidate a cache entry by setting a short expiration (matches Node.js approach)
    """
    prefixed_key = ENVIRONMENT_PREFIX + key
    try:
        if not await ensure_connection():
            return False
            
        # Match Node.js approach: set with empty value and short TTL
        await set_cache(key, "", {"EX": CACHE_TTL["INVALIDATION"]})
        logger.info(f"Invalidated cache: {prefixed_key}")
        return True
    except Exception as e:
        logger.error(f"Error invalidating cache {prefixed_key}: {e}")
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

# New helper methods for JSON handling
async def get_cache_json(key: str):
    """Get JSON value from cache"""
    value = await get_cache(key)
    if value:
        try:
            return json.loads(value)
        except json.JSONDecodeError as e:
            logger.error(f"Error decoding JSON from cache {key}: {e}")
    return None

async def set_cache_json(key: str, value, options: dict = None):
    """Set JSON value in cache with options"""
    try:
        json_value = json.dumps(value)
        return await set_cache(key, json_value, options)
    except (TypeError, json.JSONEncodeError) as e:
        logger.error(f"Error encoding object to JSON for cache {key}: {e}")
        return False