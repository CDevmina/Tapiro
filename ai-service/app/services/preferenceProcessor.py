from app.models.preferences import UserDataEntry, UserPreferences, UserPreference
from datetime import datetime
from collections import Counter, defaultdict
from typing import Dict, List, Tuple
from fastapi import HTTPException
from bson import ObjectId
import logging
import re
from app.utils.redis_util import invalidate_cache, CACHE_KEYS

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def normalize_category(category: str) -> str:
    """Normalize category names to match taxonomy standards"""
    if not category:
        return "general"
    
    # Convert to lowercase for consistency
    category = category.lower().strip()
    
    # Handle numeric category IDs first
    if category.isdigit():
        category_num = int(category)
        # Map category IDs to names based on your taxonomy
        if 100 <= category_num < 200:
            main_category = "electronics"
            # Electronics subcategories
            if category_num == 101:
                return "smartphones"
            elif category_num == 102:
                return "computers"
            elif category_num == 103:
                return "audio"
            elif category_num == 104:
                return "tvs_displays"
            elif category_num == 105:
                return "cameras"
            elif category_num == 106:
                return "wearables"
            elif category_num == 107:
                return "gaming"
            elif category_num == 108:
                return "smart_home"
            elif category_num == 109:
                return "tablets"
            elif category_num == 110:
                return "accessories"
            return main_category
            
        elif 200 <= category_num < 300:
            main_category = "clothing"
            # Clothing subcategories
            if category_num == 201:
                return "mens_clothing"
            elif category_num == 202:
                return "womens_clothing"
            elif category_num == 203:
                return "childrens_clothing"
            elif category_num == 204:
                return "footwear"
            elif category_num == 205:
                return "clothing_accessories"
            elif category_num == 206:
                return "activewear"
            elif category_num == 207:
                return "formal_wear"
            elif category_num == 208:
                return "underwear"
            elif category_num == 209:
                return "seasonal"
            elif category_num == 210:
                return "sustainable_fashion"
            return main_category
            
        elif 300 <= category_num < 400:
            main_category = "home_garden"
            # Home & Garden subcategories
            if category_num == 301:
                return "furniture"
            elif category_num == 302:
                return "kitchen"
            elif category_num == 303:
                return "home_decor"
            elif category_num == 304:
                return "bedding_bath"
            elif category_num == 305:
                return "storage"
            elif category_num == 306:
                return "garden"
            elif category_num == 307:
                return "lighting"
            elif category_num == 308:
                return "appliances"
            elif category_num == 309:
                return "home_improvement"
            elif category_num == 310:
                return "home_office"
            return main_category
            
        # Add more category ranges for 400-1000
        elif 400 <= category_num < 500:
            return "beauty_personal_care"
        elif 500 <= category_num < 600:
            return "sports_outdoors"
        elif 600 <= category_num < 700:
            return "books_media"
        elif 700 <= category_num < 800:
            return "food_grocery"
        elif 800 <= category_num < 900:
            return "automotive"
        elif 900 <= category_num < 1000:
            return "health_wellness"
        elif 1000 <= category_num < 1100:
            return "toys_games"
            
        # Fallback for any other numeric category
        return "general"
    
    # Direct category mapping for common categories
    direct_mapping = {
        "electronics": "electronics",
        "clothing": "clothing",
        "home": "home_garden",
    }
    
    if category in direct_mapping:
        return direct_mapping[category]
    
    # Pattern-based mapping - REMOVE or move the '.*' pattern to the end
    pattern_mapping = {
        r'(phone|smartphone|mobile|cell)': 'smartphones',
        r'(laptop|computer|desktop|pc)': 'computers',
        r'(tv|television|screen|monitor)': 'tvs_displays',
        r'(audio|speaker|headphone)': 'audio',
        r'(camera|photo|video)': 'cameras',
        
        # Clothing
        r'(shirt|tshirt|t-shirt|top|blouse)': 'clothing',
        r'(pant|trouser|jean|bottom)': 'clothing',
        r'(shoe|boot|footwear|sneaker)': 'footwear',
        r'(dress|gown|skirt)': 'clothing',
        
        # Home & Garden
        r'(furniture|sofa|chair|table)': 'furniture',
        r'(kitchen|cookware|appliance)': 'kitchen',
        r'(décor|decor|ornament)': 'home_decor',
        r'(garden|outdoor|plant)': 'garden',
        # ...other patterns
    }
    
    # Use regex only if no direct match
    for pattern, normalized in pattern_mapping.items():
        if re.match(pattern, category):
            return normalized
    
    # Fallback - only if no other match found
    return "general"

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
    
    # Extract new data based on data type
    new_counts, attribute_distributions = extract_preference_data(data_type, entries)
    
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
    
    # Calculate new preferences
    updated_preference_dict = calculate_preferences(new_counts, current_preferences)
    
    # Calculate updated attribute distributions
    updated_attributes = calculate_attribute_preferences(
        attribute_distributions, 
        current_attributes
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

def extract_preference_data(data_type: str, entries: List[dict]) -> Tuple[Counter, Dict]:
    """Extract category counts and attribute distributions from entries"""
    counts = Counter()
    attribute_distributions = defaultdict(lambda: defaultdict(Counter))
    
    if data_type == "purchase":
        for entry in entries:
            for item in entry.get("items", []):
                # Extract and normalize category
                raw_category = item.get("category", "general")
                category = normalize_category(raw_category)
                
                counts[category] += 1
                
                # Extract attributes
                attributes = item.get("attributes", {})
                if attributes:
                    for attr_name, attr_value in attributes.items():
                        # Record this attribute value occurrence
                        attribute_distributions[category][attr_name][str(attr_value)] += 1
                
    elif data_type == "search":
        for entry in entries:
            # Use category if specified, otherwise extract from query
            raw_category = entry.get("category", "")
            if not raw_category and entry.get("query"):
                # Simple extraction - first word of query
                raw_category = entry.get("query").split()[0]
            
            # Normalize the category
            category = normalize_category(raw_category)
            if category:
                counts[category] += 1
    
    # Ensure at least one category for testing
    if not counts:
        counts["general"] = 1
    
    return counts, attribute_distributions

def calculate_preferences(
    new_counts: Counter, 
    existing_preferences: Dict[str, float],
    decay_factor: float = 0.8
) -> Dict[str, float]:
    """Calculate updated category preferences with decay factor"""
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

def calculate_attribute_preferences(
    attribute_distributions: Dict[str, Dict[str, Counter]],
    current_attributes: Dict[str, Dict[str, Dict[str, float]]],
    decay_factor: float = 0.8
) -> Dict[str, Dict[str, Dict[str, float]]]:
    """Calculate updated attribute preferences with attribute distributions"""
    
    # Start with decayed existing distributions
    result = {}
    for category, attrs in current_attributes.items():
        result[category] = {}
        for attr_name, values in attrs.items():
            result[category][attr_name] = {
                k: v * decay_factor for k, v in values.items()
            }
    
    # Update with new distributions
    for category, attr_dict in attribute_distributions.items():
        if category not in result:
            result[category] = {}
            
        for attr_name, value_counts in attr_dict.items():
            if attr_name not in result[category]:
                result[category][attr_name] = {}
                
            # Calculate new distribution
            total = sum(value_counts.values()) or 1
            
            for value, count in value_counts.items():
                # Normalize and add to current preference
                importance = count / total * 0.5  # 50% weight to new data
                current = result[category][attr_name].get(value, 0)
                result[category][attr_name][value] = min(current + importance, 1.0)
    
    return result

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