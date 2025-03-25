from fastapi import APIRouter, HTTPException, Depends, Body
from app.models.preferences import UserPreferences, UserDataEntry
from app.db.mongodb import get_database
import logging
from datetime import datetime
from typing import Dict, Any

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.get(
    "/{user_id}/preferences", 
    response_model=UserPreferences,
    description="Get user preferences based on processed data",
    summary="Get user preferences"
)
async def get_user_preferences(user_id: str, db=Depends(get_database)):
    """
    Get user preferences based on processed data
    """
    # Log the request for debugging
    logger.info(f"GET request received for user_id: {user_id}")
    
    # Return dummy data for testing connection
    return {
        "user_id": user_id,
        "preferences": [
            {"category": "electronics", "score": 0.8},
            {"category": "books", "score": 0.6},
            {"category": "clothing", "score": 0.4}
        ],
        "updated_at": datetime.now()
    }

@router.post(
    "/data/process", 
    status_code=202,
    description="Process user data to update preferences",
    summary="Process user data"
)
async def process_user_data_endpoint(
    data: UserDataEntry = Body(...),
    db=Depends(get_database)
):
    """
    Process user data to update preferences
    """
    # Extract user_id for logging
    user_id = data.metadata.get("userId", data.email) if data.metadata else data.email
    
    # Log the request details
    logger.info(f"POST request received for data processing:")
    logger.info(f"  User: {user_id}")
    logger.info(f"  Data type: {data.data_type}")
    logger.info(f"  Number of entries: {len(data.entries)}")
    
    # Just return success without doing any actual processing
    return {
        "status": "accepted",
        "message": "Data received successfully (no processing implemented yet)",
        "user_id": user_id,
        "preferences_updated": False  # Set to False since no actual update is happening
    }