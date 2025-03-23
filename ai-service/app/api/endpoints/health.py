from fastapi import APIRouter, Depends
from datetime import datetime
from app.db.mongodb import get_database

router = APIRouter()

@router.get("")
async def health_check(db=Depends(get_database)):
    """
    Check if the API is running and can connect to dependencies
    """
    # Check MongoDB connection
    db_status = "connected"
    try:
        await db.command("ping")
    except Exception:
        db_status = "disconnected"
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "tapiro-ai",
        "dependencies": {
            "database": db_status
        }
    }