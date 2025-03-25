from app.models.preferences import UserDataEntry, UserPreferences, UserPreference
from datetime import datetime
from collections import Counter
from typing import Dict, List, Any
from app.utils.category_mappings import CATEGORY_MAPPING
from fastapi import HTTPException
from bson import ObjectId

async def process_user_data(data: UserDataEntry, db) -> UserPreferences:
    """Process user data and update their preferences"""
    
    # Extract user info
    user_id = data.metadata.get("userId")
    email = data.email
    data_type = data.data_type
    entries = data.entries
    
    # Fetch existing user preferences from MongoDB
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        # Fallback to find by email
        user = await db.users.find_one({"email": email})
        if not user:
            raise HTTPException(
                status_code=404, 
                detail="User not found"
            )
    
    # Calculate new preferences based on existing + new data
    current_preferences = user.get("preferences", [])
    new_preferences = calculate_preferences(current_preferences, data_type, entries)
    
    # Update user preferences directly in MongoDB
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "preferences": new_preferences,
            "updatedAt": datetime.now()
        }}
    )
    
    # Update the userData document to mark as processed
    await db.userData.update_one(
        {"userId": ObjectId(user_id), "timestamp": data.metadata.get("timestamp")},
        {"$set": {"processedStatus": "processed"}}
    )
    
    return UserPreferences(
        user_id=str(user["_id"]),
        preferences=[
            UserPreference(category=cat, score=score) 
            for cat, score in new_preferences.items()
        ],
        updated_at=datetime.now()
    )

def determine_category(text: str) -> str:
    """
    Determine the category from text using keyword matching
    """
    for keyword, category in CATEGORY_MAPPING.items():
        if keyword in text:
            return category
    
    # Default to "other" if no match
    return "other"

def calculate_preferences(
    new_counts: Counter, 
    existing_preferences: Dict[str, float],
    decay_factor: float = 0.8
) -> Dict[str, float]:
    """
    Calculate updated preference scores
    - New data is weighted with current importance
    - Existing data is decayed slightly to prioritize recent behavior
    """
    # Normalize counts to get relative importance
    total = sum(new_counts.values()) or 1  # Avoid division by zero
    normalized_counts = {k: v/total for k, v in new_counts.items()}
    
    # Apply decay to existing preferences and merge with new data
    updated_preferences = {}
    
    # First apply decay to existing preferences
    for category, score in existing_preferences.items():
        updated_preferences[category] = score * decay_factor
    
    # Add new information
    for category, importance in normalized_counts.items():
        # New data contributes up to 0.3 to the score (configurable)
        new_contribution = importance * 0.3
        current_score = updated_preferences.get(category, 0)
        
        # Cap at 1.0 maximum
        updated_preferences[category] = min(current_score + new_contribution, 1.0)
    
    return updated_preferences

async def get_user_preferences(user_id: str, db) -> UserPreferences:
    """
    Get user preferences from database
    """
    # This will be implemented later
    pass