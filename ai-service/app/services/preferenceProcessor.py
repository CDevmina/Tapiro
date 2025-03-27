from app.models.preferences import UserDataEntry, UserPreferences, UserPreference
from datetime import datetime
from collections import Counter
from typing import Dict, List
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
    user = await db.users.find_one({"_id": ObjectId(user_id)}) if user_id else None
    if not user:
        # Fallback to find by email
        user = await db.users.find_one({"email": email})
        if not user:
            raise HTTPException(
                status_code=404, 
                detail="User not found"
            )
    
    # Extract new counts based on data type
    new_counts = extract_preference_counts(data_type, entries)
    
    # Get current preferences - convert from list format to dict for processing
    current_preferences = {}
    if user.get("preferences"):
        for pref in user.get("preferences", []):
            if isinstance(pref, dict) and "category" in pref and "score" in pref:
                current_preferences[pref["category"]] = pref["score"]
    
    # Calculate new preferences
    updated_preference_dict = calculate_preferences(new_counts, current_preferences)
    
    # Convert back to list format for MongoDB
    new_preferences = [
        {"category": category, "score": score} 
        for category, score in updated_preference_dict.items()
    ]
    
    # Update user preferences directly in MongoDB
    await db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "preferences": new_preferences,
            "updatedAt": datetime.now()
        }}
    )
    
    # Return updated preferences in the expected format
    return UserPreferences(
        user_id=str(user["_id"]),
        preferences=[UserPreference(category=cat, score=score) 
                    for cat, score in updated_preference_dict.items()],
        updated_at=datetime.now()
    )

def extract_preference_counts(data_type: str, entries: List[dict]) -> Counter:
    """Extract preference counts from entries based on data type - simplified version"""
    counts = Counter()
    
    # Simple extraction based on data type
    if data_type == "purchase":
        for entry in entries:
            # Extract category from each item in the purchase
            for item in entry.get("items", []):
                category = item.get("category", "general")
                counts[category] += 1
                
    elif data_type == "search":
        for entry in entries:
            # Use search query as simple category
            query = entry.get("query", "")
            if query:
                # For simplicity, just use the first word as category
                category = query.split()[0].lower() if query.split() else "general"
                counts[category] += 1
    
    # Ensure at least one category for testing
    if not counts:
        counts["general"] = 1
        
    return counts

def calculate_preferences(
    new_counts: Counter, 
    existing_preferences: Dict[str, float],
    decay_factor: float = 0.8
) -> Dict[str, float]:
    """
    Simple preference calculation logic
    - New categories get a moderate score
    - Existing categories get a small boost
    """
    # Start with existing preferences and apply decay
    updated_preferences = {k: v * decay_factor for k, v in existing_preferences.items()}
    
    # Add new data with simple scoring
    total = sum(new_counts.values()) or 1  # Avoid division by zero
    
    for category, count in new_counts.items():
        # Calculate normalized importance (0 to 0.5 range)
        importance = min(count / total, 0.5)  
        
        # Update score (existing or new)
        current = updated_preferences.get(category, 0)
        updated_preferences[category] = min(current + importance, 1.0)  # Cap at 1.0
    
    return updated_preferences

async def get_user_preferences(user_id: str, db) -> UserPreferences:
    """Get user preferences from the database"""
    user = await db.users.find_one({"_id": ObjectId(user_id)})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Convert preferences from DB format to model
    preferences = []
    for pref in user.get("preferences", []):
        if isinstance(pref, dict) and "category" in pref and "score" in pref:
            preferences.append(
                UserPreference(category=pref["category"], score=pref["score"])
            )
    
    return UserPreferences(
        user_id=str(user["_id"]),
        preferences=preferences,
        updated_at=user.get("updatedAt", datetime.now())
    )