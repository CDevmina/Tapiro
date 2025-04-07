from fastapi import APIRouter, Depends
from app.db.mongodb import get_database, is_database_connected
from app.utils.redis_util import ping_redis
from app.taxonomy.google_taxonomy import load_taxonomy

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
    
    # Check taxonomy service
    taxonomy_status = True
    try:
        load_taxonomy()
    except Exception:
        taxonomy_status = False
    
    # Service is healthy if all components are connected
    overall_status = "healthy" if (db_status, redis_status, taxonomy_status) else "unhealthy"
    
    return {
        "status": overall_status,
        "components": {
            "database": "connected" if db_status else "disconnected",
            "redis": "connected" if redis_status else "disconnected",
            "taxonomy": "connected" if taxonomy_status else "disconnected"
        },
        "version": "1.0.0"
    }

@router.get(
    "/taxonomy",
    description="Check taxonomy service health specifically",
    summary="Taxonomy health check"
)
async def taxonomy_health():
    """Check taxonomy service health specifically"""
    try:
        load_taxonomy()
        return {
            "status": "ok", 
            "version": "google_product_categories_2025"
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }