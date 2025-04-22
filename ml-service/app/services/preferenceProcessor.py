from app.models.preferences import UserDataEntry, UserPreferences, UserPreference
from datetime import datetime
from fastapi import HTTPException
from bson import ObjectId
import logging
from app.utils.redis_util import invalidate_cache, CACHE_KEYS
from typing import List, Dict, Any, Optional
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
    
    # Fetch the full user document from MongoDB to get demographics
    user = None
    user_demographics = {}
    if user_id and ObjectId.is_valid(user_id):
        user = await db.users.find_one({"_id": ObjectId(user_id)})
    
    if not user:
        # Fallback to find by email
        user = await db.users.find_one({"email": email})
        if not user:
            logger.error(f"User not found: {email}")
            raise HTTPException(status_code=404, detail="User not found")

    # Extract demographics if user found
    if user:
        user_demographics = {
            "gender": user.get("gender"),
            "incomeBracket": user.get("incomeBracket"),
            "country": user.get("country"),
            "age": user.get("age"),
            # Add inferred fields here later if needed
        }
        logger.info(f"Fetched demographics for user {email}: {user_demographics}")
    else:
         logger.warning(f"Could not fetch demographics for user {email}")


    # Get current preferences from the user object
    user_preferences = user.get("preferences", [])
    
    # Convert to dictionary for easier updates
    preference_dict = {pref["category"]: pref for pref in user_preferences}
    
    # Get taxonomy service
    taxonomy = await get_taxonomy_service(db)
    
    # Process entries based on data type, passing demographics
    try:
        if data_type == "purchase":
            await process_purchase_data(entries, preference_dict, taxonomy, user_demographics)
        elif data_type == "search":
            await process_search_data(entries, preference_dict, taxonomy, user_demographics)
        else:
            logger.warning(f"Unknown data type: {data_type}")
    except Exception as e:
        logger.error(f"Error processing {data_type} data: {str(e)}")
        # Fall back to using embedding model for all data
        try:
            # Pass demographics to fallback as well
            await process_with_embeddings(entries, data_type, preference_dict, taxonomy, user_demographics)
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
        
        # Invalidate store-specific caches for this user
        if user.get("privacySettings", {}).get("optInStores"):
            user_object_id = str(user["_id"])
            for store_id in user["privacySettings"]["optInStores"]:
                 await invalidate_cache(f"{CACHE_KEYS['STORE_PREFERENCES']}{user_object_id}:{store_id}")
            logger.info(f"Invalidated store-specific caches for user {auth0_id}")

    
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

async def process_purchase_data(entries, preference_dict, taxonomy, demographics: Optional[Dict[str, Any]] = None):
    """Process purchase data using rule-based system, considering demographics and buying patterns"""
    category_counts = defaultdict(int)
    # Store attribute counts AND total price/item count per category for override logic
    attribute_counts = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    category_price_totals = defaultdict(float)
    category_item_counts = defaultdict(int)

    # --- Refined Demographic Usage ---
    demographics = demographics or {} # Ensure demographics is a dict
    gender = demographics.get("gender")
    age = demographics.get("age")
    income = demographics.get("incomeBracket")
    country = demographics.get("country")
    # --- End Refined Demographic Usage ---

    # Count purchases, attributes, and track prices
    for entry in entries:
        for item in entry.get("items", []):
            category = item.get("category")
            if not category:
                continue

            quantity = item.get("quantity", 1)
            price = item.get("price") # Get item price

            # Increment category count
            category_counts[category] += quantity

            # Track price for override logic
            if price is not None and price > 0: # Only consider valid prices
                category_price_totals[category] += price * quantity
                category_item_counts[category] += quantity

            # Process attributes
            if "attributes" in item:
                for attr_name, attr_value in item["attributes"].items():
                    attribute_counts[category][attr_name][attr_value] += quantity

    # Update preference scores (Category level)
    total_items_overall = sum(category_counts.values())
    if total_items_overall > 0:
        for category, count in category_counts.items():
            # --- Category Score Calculation (remains largely the same) ---
            base_score = min(count / (total_items_overall * 0.5), 1.0)
            boost_factor = 1.0
            category_name = taxonomy.get_category_name(category)

            # Apply demographic boosts (gender, age)
            if gender == "female" and category_name in ["Fashion", "Beauty", "Skincare", "Makeup"]:
                boost_factor *= 1.1
            elif gender == "male" and category_name in ["Electronics", "Tools", "Laptops"]:
                boost_factor *= 1.05
            if age:
                if 18 <= age <= 30 and category_name in ["Smartphones", "Wearables", "Audio", "Gaming"]: # Added Gaming
                     boost_factor *= 1.05
                elif age >= 50 and category_name in ["Health", "Home"]:
                     boost_factor *= 1.08

            final_score = min(base_score * boost_factor, 1.0)

            # Update category score in preference_dict (using EMA)
            if category not in preference_dict:
                preference_dict[category] = {
                    "category": category,
                    "score": final_score,
                    "attributes": {}
                }
            else:
                alpha = 0.3
                old_score = preference_dict[category]["score"]
                preference_dict[category]["score"] = alpha * final_score + (1 - alpha) * old_score
            # --- End Category Score Calculation ---


            # --- Process Attributes for this Category ---
            if category in attribute_counts:
                # Calculate average price for this category in this batch (for override)
                avg_price_in_batch = (category_price_totals[category] / category_item_counts[category]) \
                                     if category_item_counts[category] > 0 else 0

                # Define a 'low price threshold' (EXAMPLE - needs tuning per category)
                # This is highly dependent on your product mix and taxonomy.
                # You might fetch these thresholds from config or taxonomy definition.
                low_price_thresholds = {
                    "Laptops": 700,
                    "Smartphones": 400,
                    "Clothing": 30,
                    "Shoes": 40,
                    # ... add more categories
                }
                is_buying_cheap = avg_price_in_batch > 0 and \
                                  avg_price_in_batch < low_price_thresholds.get(category_name, float('inf'))

                if is_buying_cheap:
                    logger.info(f"User buying pattern override triggered for category '{category_name}' (Avg Price: {avg_price_in_batch:.2f})")


                for attr_name, attr_values in attribute_counts[category].items():
                    attr_total = sum(attr_values.values())
                    if "attributes" not in preference_dict[category]:
                        preference_dict[category]["attributes"] = {}
                    if attr_name not in preference_dict[category]["attributes"]:
                        preference_dict[category]["attributes"][attr_name] = {}

                    for value, value_count in attr_values.items():
                        normalized_score = value_count / attr_total
                        attribute_boost = 1.0

                        # --- Apply Demographic Influence (with potential override) ---

                        # 1. Income influence on price_range
                        if attr_name == "price_range" and income:
                            if income in ['100k-200k', '>200k']:
                                if value in ['premium', 'luxury']:
                                    attribute_boost *= 1.2 # Stronger boost
                                    # OVERRIDE: If buying cheap, negate the high-income boost
                                    if is_buying_cheap:
                                        attribute_boost /= 1.3 # Reduce significantly
                                elif value in ['budget', 'mid_range']:
                                     # If high income but buying cheap, slightly boost lower ranges
                                     if is_buying_cheap:
                                         attribute_boost *= 1.1

                            elif income in ['<25k', '25k-50k']:
                                if value in ['budget', 'mid_range']:
                                    attribute_boost *= 1.15
                                # If low income but buying expensive (less likely override needed, but possible)
                                # elif value in ['premium', 'luxury'] and not is_buying_cheap:
                                #    attribute_boost *= 0.9 # Slightly penalize?

                        # 2. Gender influence on color (example)
                        if category_name == "Fashion" and attr_name == "color" and gender:
                             if gender == "female" and value in ["pink", "purple", "rose_gold"]: attribute_boost *= 1.1
                             elif gender == "male" and value in ["navy", "gray", "black"]: attribute_boost *= 1.05

                        # 3. Age influence on brand (example)
                        if category_name == "Electronics" and attr_name == "brand" and age:
                            if age <= 25 and value in ["Apple", "Beats", "Razer"]: attribute_boost *= 1.05
                            elif age >= 45 and value in ["Sony", "Bose", "Dell"]: attribute_boost *= 1.05

                        # 4. Income influence on brand (example - add luxury brands)
                        # luxury_brands = ["Gucci", "Prada", "Rolex", "Le Creuset", "All-Clad"] # Example
                        # if attr_name == "brand" and income in ['100k-200k', '>200k'] and value in luxury_brands:
                        #    attribute_boost *= 1.1
                        #    # OVERRIDE: If buying cheap, negate boost for luxury brands
                        #    if is_buying_cheap:
                        #        attribute_boost /= 1.2


                        final_attribute_score = min(normalized_score * attribute_boost, 1.0)
                        # --- End Attribute Influence ---

                        # Update attribute score using EMA
                        alpha_attr = 0.3 # Use same alpha or different one for attributes
                        if value in preference_dict[category]["attributes"][attr_name]:
                            old_value = preference_dict[category]["attributes"][attr_name][value]
                            preference_dict[category]["attributes"][attr_name][value] = \
                                alpha_attr * final_attribute_score + (1 - alpha_attr) * old_value
                        else:
                            preference_dict[category]["attributes"][attr_name][value] = final_attribute_score

async def process_search_data(entries, preference_dict, taxonomy, demographics: Optional[Dict[str, Any]] = None):
    """Process search data using embedding model, considering demographics"""
    search_relevance = defaultdict(float)
    
    # --- Example Demographic Usage ---
    demographics = demographics or {}
    gender = demographics.get("gender")
    age = demographics.get("age")
    # --- End Example ---

    for entry in entries:
        query = entry.get("query")
        provided_category = entry.get("category") # Category explicitly sent with search
        matched_category = None
        match_score = 0.0

        if not query and not provided_category:
            continue # Skip if no query and no category provided

        # Determine the category
        if provided_category:
            matched_category = provided_category
            match_score = 1.0 # Assume full relevance if category is provided
        elif query:
            # Use embeddings to match query to category
            try:
                match_result = await taxonomy.match_category(query)
                if match_result["threshold_met"]:
                    matched_category = match_result["category"]
                    match_score = match_result["score"]
            except Exception as e:
                logger.error(f"Error matching query '{query}': {str(e)}")

        # If a category was determined, calculate boosted relevance
        if matched_category:
            relevance_boost = 1.0
            category_name = taxonomy.get_category_name(matched_category) # Get name for logic

            # --- Apply Demographic Boost to Relevance ---
            if gender == 'female' and category_name in ['Fashion', 'Beauty', 'Skincare']:
                relevance_boost *= 1.1
            elif gender == 'male' and category_name in ['Electronics', 'Tools', 'Laptops']:
                 relevance_boost *= 1.05

            if age and 18 <= age <= 30 and category_name in ["Smartphones", "Gaming"]: # Add Gaming if exists
                relevance_boost *= 1.05
            # --- End Demographic Boost ---

            # Add boosted score to search relevance dict
            search_relevance[matched_category] += match_score * relevance_boost

    # Normalize search relevance scores
    if search_relevance:
        max_relevance = max(search_relevance.values()) if search_relevance else 0 # Handle empty dict
        if max_relevance > 0:
            # Update preferences
            for category, relevance in search_relevance.items():
                score = min(relevance / max_relevance, 1.0)
                
                if category not in preference_dict:
                    preference_dict[category] = {
                        "category": category,
                        "score": score,
                        "attributes": {}
                    }
                else:
                    alpha = 0.2
                    old_score = preference_dict[category]["score"]
                    preference_dict[category]["score"] = alpha * score + (1 - alpha) * old_score

async def process_with_embeddings(entries, data_type, preference_dict, taxonomy, demographics: Optional[Dict[str, Any]] = None):
    """Fallback processing using embeddings, potentially considering demographics"""
    logger.info("Using embedding fallback processing")
    
    # --- Demographic Usage ---
    demographics = demographics or {}
    gender = demographics.get("gender")
    age = demographics.get("age")
    # --- End Demographic Usage ---

    # For purchase data
    if data_type == "purchase":
        items = []
        for entry in entries:
            if "items" in entry:
                items.extend([item.get("name", "") for item in entry["items"]])
                
        for item_name in items:
            try:
                match_result = await taxonomy.match_category(item_name)
                if match_result["threshold_met"]:
                    category = match_result["category"]
                    score = match_result["score"]
                    boost_factor = 1.0
                    category_name = taxonomy.get_category_name(category)

                    # --- Apply Demographic Boost (Similar to purchase logic) ---
                    if gender == "female" and category_name in ["Fashion", "Beauty"]:
                        boost_factor *= 1.1
                    # Add other demographic boosts (age, etc.) here if desired
                    if age and age >= 50 and category_name == "Health":
                       boost_factor *= 1.08

                    final_score = min(score * boost_factor, 1.0)
                    # --- End Demographic Boost ---

                    # Update preference dict (using final_score)
                    if category not in preference_dict:
                        preference_dict[category] = {
                            "category": category,
                            "score": final_score, # Use boosted score
                            "attributes": {}
                        }
                    else:
                        # Blend score (maybe use a lower weight for embedding matches?)
                        alpha_embed = 0.2
                        old_score = preference_dict[category]["score"]
                        preference_dict[category]["score"] = alpha_embed * final_score + (1 - alpha_embed) * old_score
                        # Alternative: Just take the max?
                        # preference_dict[category]["score"] = max(old_score, final_score * 0.8)
            except Exception as e:
                logger.error(f"Error processing item '{item_name}' via embedding: {str(e)}")

    # For search data, call the updated search processor (already passes demographics)
    elif data_type == "search":
        await process_search_data(entries, preference_dict, taxonomy, demographics)

async def normalize_categories(preferences, taxonomy):
    """Ensure all categories use IDs instead of names"""
    normalized = []
    
    # Build name-to-id mapping
    name_to_id = {}
    id_to_name = {} # Also build reverse mapping for safety check
    for cat in taxonomy.taxonomy.categories:
        name_to_id[cat.name.lower()] = cat.id
        id_to_name[cat.id] = cat.name # Store ID to Name mapping
    
    for pref in preferences:
        category_key = pref["category"]
        # Check if the key is a name and needs conversion
        if isinstance(category_key, str) and category_key.lower() in name_to_id:
            pref["category"] = name_to_id[category_key.lower()]
        # Safety check: Ensure the final category key is a valid ID present in the taxonomy
        elif category_key not in id_to_name:
             logger.warning(f"Category '{category_key}' not found in taxonomy IDs during normalization. Skipping.")
             continue # Skip this preference if the category ID is invalid

        normalized.append(pref)
    
    return normalized