from fastapi import APIRouter, Depends
from app.db.mongodb import get_database, is_database_connected

router = APIRouter()

@router.get(
    "", 
    description="Check the health of the AI service",
    summary="Health check"
)
async def health_check(db=Depends(get_database)):
    """Check if the AI service is healthy"""
    db_status = await is_database_connected(db)
    
    return {
        "status": "healthy" if db_status else "unhealthy",
        "components": {
            "database": "connected" if db_status else "disconnected"
        },
        "version": "1.0.0"
    }