from app.models.preferences import UserDataEntry, UserPreferences, UserPreference
from datetime import datetime
from fastapi import HTTPException
from bson import ObjectId
import logging
from app.utils.redis_util import invalidate_cache, CACHE_KEYS
from typing import List, Dict, Any
from app.services.taxonomyService import get_taxonomy_service
from collections import defaultdict

logger = logging.getLogger(__name__)

async def process_user_data(data: UserDataEntry, db) -> UserPreferences:
    """Process user data and update their preferences"""
    
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
    
    # Get current preferences from the user object
    user_preferences = user.get("preferences", [])
    
    # Convert to dictionary for easier updates
    preference_dict = {pref["category"]: pref for pref in user_preferences}
    
    # Get taxonomy service
    taxonomy = await get_taxonomy_service(db)
    
    # Process entries based on data type
    try:
        if data_type == "purchase":
            await process_purchase_data(entries, preference_dict, taxonomy)
        elif data_type == "search":
            await process_search_data(entries, preference_dict, taxonomy)
        else:
            logger.warning(f"Unknown data type: {data_type}")
    except Exception as e:
        logger.error(f"Error processing {data_type} data: {str(e)}")
        # Fall back to using embedding model for all data
        try:
            await process_with_embeddings(entries, data_type, preference_dict, taxonomy)
        except Exception as fallback_error:
            logger.error(f"Fallback processing also failed: {str(fallback_error)}")
            raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")
    
    # Convert preference_dict back to list
    updated_preferences = list(preference_dict.values())
    
    # Add normalization before database update
    normalized_preferences = await normalize_categories(updated_preferences, taxonomy)
    
    # Update user preferences in database with normalized data
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "preferences": normalized_preferences,
                "updatedAt": datetime.now()
            }
        }
    )
    
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
    
    # Return updated preferences in the expected format
    return UserPreferences(
        user_id=str(user["_id"]),
        preferences=[
            UserPreference(
                category=item["category"], 
                score=item["score"],
                attributes=item.get("attributes")
            ) for item in normalized_preferences
        ],
        updated_at=datetime.now()
    )

async def process_purchase_data(entries, preference_dict, taxonomy):
    """Process purchase data using rule-based system"""
    category_counts = defaultdict(int)
    attribute_counts = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    
    # Count purchases by category and attribute
    for entry in entries:
        if "items" not in entry:
            continue
            
        for item in entry["items"]:
            category = item.get("category")
            if not category:
                continue
                
            # Increment category count
            category_counts[category] += item.get("quantity", 1)
            
            # Process attributes
            if "attributes" in item:
                for attr_name, attr_value in item["attributes"].items():
                    attribute_counts[category][attr_name][attr_value] += item.get("quantity", 1)
    
    # Update preference scores
    total_items = sum(category_counts.values())
    if total_items > 0:
        for category, count in category_counts.items():
            # Calculate category score (normalized)
            score = min(count / (total_items * 0.5), 1.0)  # Cap at 1.0
            
            # Create or update preference
            if category not in preference_dict:
                preference_dict[category] = {
                    "category": category,
                    "score": score,
                    "attributes": {}
                }
            else:
                # Use exponential moving average to blend new score with existing
                alpha = 0.3  # Blend factor
                old_score = preference_dict[category]["score"]
                preference_dict[category]["score"] = alpha * score + (1 - alpha) * old_score
            
            # Process attributes
            if category in attribute_counts:
                for attr_name, attr_values in attribute_counts[category].items():
                    # Get total for this attribute
                    attr_total = sum(attr_values.values())
                    
                    # Create attribute distribution
                    if "attributes" not in preference_dict[category]:
                        preference_dict[category]["attributes"] = {}
                        
                    if attr_name not in preference_dict[category]["attributes"]:
                        preference_dict[category]["attributes"][attr_name] = {}
                        
                    # Calculate normalized values
                    for value, value_count in attr_values.items():
                        normalized_score = value_count / attr_total
                        
                        # Use exponential moving average if attribute value exists
                        if value in preference_dict[category]["attributes"][attr_name]:
                            old_value = preference_dict[category]["attributes"][attr_name][value]
                            preference_dict[category]["attributes"][attr_name][value] = \
                                alpha * normalized_score + (1 - alpha) * old_value
                        else:
                            preference_dict[category]["attributes"][attr_name][value] = normalized_score

async def process_search_data(entries, preference_dict, taxonomy):
    """Process search data using embedding model"""
    # Dictionary to track category relevance from searches
    search_relevance = defaultdict(float)
    
    for entry in entries:
        query = entry.get("query")
        if not query:
            continue
            
        # If category is already provided
        if entry.get("category"):
            category = entry["category"]
            # A direct category search is strong signal
            search_relevance[category] += 1.0
            continue
        
        # Use embeddings to match query to category
        try:
            match_result = await taxonomy.match_category(query)
            if match_result["threshold_met"]:
                category = match_result["category"]
                # Weight by confidence score
                search_relevance[category] += match_result["score"]
        except Exception as e:
            logger.error(f"Error matching query '{query}': {str(e)}")
    
    # Normalize search relevance scores
    if search_relevance:
        max_relevance = max(search_relevance.values())
        if max_relevance > 0:
            # Update preferences
            for category, relevance in search_relevance.items():
                # Normalize to 0-1 range
                score = min(relevance / max_relevance, 1.0)
                
                if category not in preference_dict:
                    preference_dict[category] = {
                        "category": category,
                        "score": score,
                        "attributes": {}
                    }
                else:
                    # Use exponential moving average
                    alpha = 0.2  # Lower weight for searches vs purchases
                    old_score = preference_dict[category]["score"]
                    preference_dict[category]["score"] = alpha * score + (1 - alpha) * old_score

async def process_with_embeddings(entries, data_type, preference_dict, taxonomy):
    """Fallback processing using embeddings for all data types"""
    logger.info("Using embedding fallback processing")
    
    # For purchase data
    if data_type == "purchase":
        items = []
        for entry in entries:
            if "items" in entry:
                items.extend([item.get("name", "") for item in entry["items"]])
                
        # Process each item name
        for item_name in items:
            try:
                match_result = await taxonomy.match_category(item_name)
                if match_result["threshold_met"]:
                    category = match_result["category"]
                    score = match_result["score"]
                    
                    if category not in preference_dict:
                        preference_dict[category] = {
                            "category": category,
                            "score": score,
                            "attributes": {}
                        }
                    else:
                        # Update using max
                        preference_dict[category]["score"] = max(
                            preference_dict[category]["score"],
                            score * 0.8  # Reduce confidence for embedding-based matches
                        )
            except Exception as e:
                logger.error(f"Error processing item '{item_name}': {str(e)}")
    
    # For search data, same as regular processing
    elif data_type == "search":
        await process_search_data(entries, preference_dict, taxonomy)

async def normalize_categories(preferences, taxonomy):
    """Ensure all categories use IDs instead of names"""
    normalized = []
    
    # Build name-to-id mapping
    name_to_id = {}
    for cat in taxonomy.taxonomy.categories:
        name_to_id[cat.name.lower()] = cat.id
    
    for pref in preferences:
        category = pref["category"]
        # If category is a name rather than ID, convert it
        if category.lower() in name_to_id:
            pref["category"] = name_to_id[category.lower()]
        normalized.append(pref)
    
    return normalized

async def update_user_preferences(auth0_id: str, email: str, preferences: List[UserPreference], db) -> UserPreferences:
    """Update user preferences directly"""
    
    logger.info(f"Processing preference update for user {auth0_id}")
    
    # Get taxonomy service for validation
    taxonomy = await get_taxonomy_service(db)
    
    # Validate preferences against taxonomy
    try:
        taxonomy.validate_preferences(preferences)
    except ValueError as e:
        logger.error(f"Preference validation failed: {str(e)}")
        raise HTTPException(status_code=400, detail=str(e))
    
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