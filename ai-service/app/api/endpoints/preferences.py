from fastapi import APIRouter, HTTPException, Depends, Body
from app.models.preferences import UserPreferences, UserDataEntry
from app.db.mongodb import get_database
from app.services.preferenceProcessor import process_user_data

router = APIRouter()

@router.get("/{user_id}/preferences", response_model=UserPreferences)
async def get_user_preferences(user_id: str, db=Depends(get_database)):
    """
    Get user preferences based on processed data
    """
    # This is a placeholder - will be implemented with actual DB query
    user_prefs = await db.user_preferences.find_one({"user_id": user_id})
    
    if not user_prefs:
        raise HTTPException(status_code=404, detail="User preferences not found")
        
    return user_prefs

@router.post("/data/process", status_code=202)
async def process_user_data_endpoint(
    data: UserDataEntry = Body(...),
    db=Depends(get_database)
):
    """
    Process user data to update preferences
    """
    # This will be implemented later with actual processing logic
    return {"status": "accepted", "message": "Data accepted for processing"}