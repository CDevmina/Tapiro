from fastapi import APIRouter, Depends
from app.db.mongodb import get_database, is_database_connected
from app.utils.redis_util import ping_redis

router = APIRouter()

@router.get(
    "", 
    description="Check the health of the AI service",
    summary="Health check"
)
async def health_check(db=Depends(get_database)):
    """Check if the AI service is healthy"""
    db_status = await is_database_connected(db)
    redis_status = await ping_redis()
    
    # Service is healthy if all components are connected
    overall_status = "healthy" if (db_status and redis_status) else "unhealthy"
    
    return {
        "status": overall_status,
        "components": {
            "database": "connected" if db_status else "disconnected",
            "redis": "connected" if redis_status else "disconnected",
        },
        "version": "1.0.0"
    }