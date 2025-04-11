from app.models.preferences import UserDataEntry, UserPreferences, UserPreference
from datetime import datetime
from fastapi import HTTPException
from bson import ObjectId
import logging
from app.utils.redis_util import invalidate_cache, CACHE_KEYS
from typing import List

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Placeholder for AI processing
async def process_user_data(data: UserDataEntry, db) -> UserPreferences:
    """Process user data and update their preferences"""
    
    # Extract user info
    user_id = data.metadata.get("userId") if data.metadata else None
    email = data.email
    data_type = data.data_type
    
    logger.info(f"Processing data for user {user_id or email}, type: {data_type}")
    
    # Fetch existing user preferences from MongoDB
    user = None
    if user_id and ObjectId.is_valid(user_id):
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        # Fallback to find by email
        user = await db.users.find_one({"email": email})
        if not user:
            logger.error(f"User not found: {email}")
            raise HTTPException(status_code=404, detail="User not found")
    
    # Get current preferences from the user object
    # In this placeholder version, we simply return the existing preferences
    user_preferences = user.get("preferences", [])
    
    # Update the userData collection's processedStatus to "processed"
    try:
        result = await db.userData.update_one(
            {
                "email": email,
                "processedStatus": "pending"
            },
            {"$set": {"processedStatus": "processed"}}
        )
        logger.info(f"Updated userData status to 'processed' for {email}, modified: {result.modified_count}")
    except Exception as e:
        logger.error(f"Failed to update userData status: {str(e)}")
    
    # Invalidate user preferences cache using auth0Id
    if user.get("auth0Id"):
        auth0_id = user["auth0Id"]
        await invalidate_cache(f"{CACHE_KEYS['PREFERENCES']}{auth0_id}")
        logger.info(f"Invalidated preferences cache for user {auth0_id}")
    
    # Return existing preferences in the expected format
    return UserPreferences(
        user_id=str(user["_id"]),
        preferences=[
            UserPreference(
                category=item["category"], 
                score=item["score"],
                attributes=item.get("attributes")
            ) for item in user_preferences
        ],
        updated_at=datetime.now()
    )

async def update_user_preferences(auth0_id: str, email: str, preferences: List[UserPreference], db) -> UserPreferences:
    """Update user preferences directly"""
    
    logger.info(f"Processing preference update for user {auth0_id}")
    
    # Find the user in the database
    user = await db.users.find_one({"auth0Id": auth0_id})
    if not user:
        # Try finding by email as fallback
        user = await db.users.find_one({"email": email})
        if not user:
            logger.error(f"User not found: {email}")
            raise HTTPException(status_code=404, detail="User not found")
    
    # Update user preferences
    update_result = await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "preferences": [pref.dict() for pref in preferences],
                "updatedAt": datetime.now()
            }
        }
    )
    
    if update_result.modified_count == 0:
        logger.warning(f"No changes made to preferences for user {auth0_id}")
    
    # Invalidate cache
    await invalidate_cache(f"{CACHE_KEYS['PREFERENCES']}{auth0_id}")
    
    # Return updated preferences
    return UserPreferences(
        user_id=str(user["_id"]),
        preferences=preferences,
        updated_at=datetime.now()
    )