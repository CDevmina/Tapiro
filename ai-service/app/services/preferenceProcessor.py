from app.models.preferences import UserDataEntry, UserPreferences, UserPreference
from datetime import datetime
from fastapi import HTTPException
from bson import ObjectId
import logging
from app.utils.redis_util import invalidate_cache, CACHE_KEYS
from app.ai import process_data_with_ai

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Modify your existing process_user_data function
async def process_user_data(data: UserDataEntry, db) -> UserPreferences:
    """Process user data and update their preferences with AI"""
    
    # Extract user info
    user_id = data.metadata.get("userId") if data.metadata else None
    email = data.email
    data_type = data.data_type
    entries = data.entries
    
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
    
    # Get current preferences with attributes
    current_preferences = {}
    current_attributes = {}
    
    if user.get("preferences"):
        for pref in user.get("preferences", []):
            if isinstance(pref, dict) and "category" in pref and "score" in pref:
                category = pref["category"]
                current_preferences[category] = pref["score"]
                
                # Get attributes if present
                if "attributes" in pref and pref["attributes"]:
                    current_attributes[category] = pref["attributes"]
    
    # Use AI to process the user data - this replaces the redundant functions
    updated_preference_dict, updated_attributes = await process_data_with_ai(
        data_type, 
        entries,
        current_preferences
    )
    
    # Convert back to list format for MongoDB
    new_preferences = []
    for category, score in updated_preference_dict.items():
        pref_obj = {
            "category": category,
            "score": score
        }
        
        # Add attributes if available for this category
        if category in updated_attributes:
            pref_obj["attributes"] = updated_attributes[category]
            
        new_preferences.append(pref_obj)
    
    # Update user preferences directly in MongoDB
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "preferences": new_preferences,
            "updatedAt": datetime.now()
        }}
    )
    
    # Invalidate user preferences cache using auth0Id
    if user.get("auth0Id"):
        auth0_id = user["auth0Id"]
        await invalidate_cache(f"{CACHE_KEYS['PREFERENCES']}{auth0_id}")
        logger.info(f"Invalidated preferences cache for user {auth0_id}")
    
    # Invalidate store-specific preference caches if they exist
    if user.get("privacySettings") and user.get("privacySettings").get("optInStores"):
        user_id_str = str(user["_id"])
        for store_id in user["privacySettings"]["optInStores"]:
            cache_key = f"{CACHE_KEYS['STORE_PREFERENCES']}{user_id_str}:{store_id}"
            await invalidate_cache(cache_key)
            logger.info(f"Invalidated store preferences cache: {cache_key}")
    
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
    
    # Return updated preferences in the expected format
    return UserPreferences(
        user_id=str(user["_id"]),
        preferences=[
            UserPreference(
                category=item["category"], 
                score=item["score"],
                attributes=item.get("attributes")
            ) for item in new_preferences
        ],
        updated_at=datetime.now()
    )

    """Get user preferences from the database"""
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Convert preferences from DB format to model
    preferences = []
    for pref in user.get("preferences", []):
        if isinstance(pref, dict) and "category" in pref and "score" in pref:
            preferences.append(
                UserPreference(
                    category=pref["category"], 
                    score=pref["score"],
                    attributes=pref.get("attributes")
                )
            )
    
    return UserPreferences(
        user_id=str(user["_id"]),
        preferences=preferences,
        updated_at=user.get("updatedAt", datetime.now())
    )