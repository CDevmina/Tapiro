import logging
from app.models.preferences import UserDataEntry, UserPreferences, UserPreference
from datetime import datetime
from fastapi import HTTPException
from bson import ObjectId
from app.utils.redis_util import invalidate_cache, CACHE_KEYS
from typing import List, Dict, Any, Optional
from app.services.taxonomyService import get_taxonomy_service
from collections import defaultdict
from app.services.demographicInference import run_inference_for_user # Import the inference runner

logger = logging.getLogger(__name__)

async def process_user_data(data: UserDataEntry, db) -> UserPreferences:
    """Process user data and update their preferences"""

    # Extract user info
    user_id_from_meta = data.metadata.get("userId") if data.metadata else None
    email = data.email
    data_type = data.data_type
    entries = data.entries

    logger.info(f"Processing data for user email {email} (ID from meta: {user_id_from_meta}), type: {data_type}")

    # Fetch the full user document from MongoDB to get demographics
    user = None
    if user_id_from_meta and ObjectId.is_valid(user_id_from_meta):
        user = await db.users.find_one({"_id": ObjectId(user_id_from_meta)})
        if user and user.get("email") != email:
             logger.warning(f"User ID {user_id_from_meta} provided in metadata maps to email {user.get('email')}, but processing request is for {email}. Proceeding with email lookup.")
             user = None # Force email lookup if mismatch

    if not user:
        # Fallback to find by email
        user = await db.users.find_one({"email": email})
        if not user:
            logger.error(f"User not found by email: {email}")
            # Mark as failed before raising
            await mark_processing_failed(db, email) # Assuming mark_processing_failed exists
            raise HTTPException(status_code=404, detail="User not found")

    user_id = str(user["_id"]) # Use the confirmed user ID from DB
    logger.info(f"Found user {email} with DB ID {user_id}")

    # Extract demographics from the nested 'demographicData' field
    user_demographics_nested = user.get("demographicData", {})
    # Flatten the dictionary to pass to processing functions
    user_demographics_flat = {
        "gender": user_demographics_nested.get("gender"),
        "incomeBracket": user_demographics_nested.get("incomeBracket"),
        "country": user_demographics_nested.get("country"),
        "age": user_demographics_nested.get("age"),
        "inferredHasKids": user_demographics_nested.get("inferredHasKids"),
        "inferredRelationshipStatus": user_demographics_nested.get("inferredRelationshipStatus"),
        "inferredEmploymentStatus": user_demographics_nested.get("inferredEmploymentStatus"),
        "inferredEducationLevel": user_demographics_nested.get("inferredEducationLevel"),
        "inferredAgeBracket": user_demographics_nested.get("inferredAgeBracket"),
    }
    # Filter out None values if desired, but processing functions handle None
    # user_demographics_flat = {k: v for k, v in user_demographics_flat.items() if v is not None}

    logger.info(f"Using demographics for user {email}: {user_demographics_flat}")


    # Get current preferences from the user object
    user_preferences = user.get("preferences", [])

    # Convert to dictionary for easier updates {category_id: preference_object}
    preference_dict = {}
    for pref in user_preferences:
        if isinstance(pref, dict) and "category" in pref:
             preference_dict[pref["category"]] = pref
        else:
             logger.warning(f"Skipping invalid preference item for user {email}: {pref}")


    # Get taxonomy service
    taxonomy = await get_taxonomy_service(db)

    # Process entries based on data type, passing flattened demographics
    try:
        if data_type == "purchase":
            await process_purchase_data(entries, preference_dict, taxonomy, user_demographics_flat)
        elif data_type == "search":
            await process_search_data(entries, preference_dict, taxonomy, user_demographics_flat)
        else:
            logger.warning(f"Unknown data type: {data_type}")
            # Optionally, still try embedding fallback for unknown types
            await process_with_embeddings(entries, data_type, preference_dict, taxonomy, user_demographics_flat)

    except Exception as e:
        logger.error(f"Error processing {data_type} data for {email}: {str(e)}", exc_info=True)
        # Fall back to using embedding model for all data
        try:
            logger.info(f"Attempting fallback embedding processing for {email} due to error.")
            # Pass flattened demographics to fallback as well
            await process_with_embeddings(entries, data_type, preference_dict, taxonomy, user_demographics_flat)
        except Exception as fallback_error:
            logger.error(f"Fallback processing also failed for {email}: {str(fallback_error)}", exc_info=True)
            # Mark as failed before raising
            await mark_processing_failed(db, email) # Assuming mark_processing_failed exists
            raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

    # Convert preference_dict back to list
    updated_preferences_list = list(preference_dict.values())

    # Add normalization before database update
    # Ensure normalize_categories handles potential issues gracefully
    try:
        normalized_preferences = await normalize_categories(updated_preferences_list, taxonomy)
    except Exception as norm_error:
        logger.error(f"Error normalizing categories for {email}: {norm_error}", exc_info=True)
        normalized_preferences = updated_preferences_list # Use unnormalized as fallback

    # Update user preferences in database with normalized data
    update_time = datetime.now()
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "preferences": normalized_preferences,
                "updatedAt": update_time
            }
        }
    )
    logger.info(f"Successfully updated preferences for user {email} in DB.")

    # Update the userData collection's processedStatus to "processed"
    # Find the specific document(s) related to this submission batch if possible,
    # otherwise update the oldest pending one for the user.
    # This assumes the AI service passes back an ID or we can match based on content/timestamp.
    # For simplicity, updating the first pending entry found for the email.
    try:
        # Ideally, match on a unique ID for the submission batch if available
        # submission_id = data.metadata.get("submissionId")
        # if submission_id:
        #    match_criteria = {"_id": ObjectId(submission_id)}
        # else:
        match_criteria = {"email": email, "processedStatus": "pending"}

        result = await db.userData.update_one(
            match_criteria,
            {"$set": {"processedStatus": "processed"}}
            # Consider adding sort if multiple pending exist and no ID is available
        )
        if result.modified_count > 0:
            logger.info(f"Updated userData status to 'processed' for {email}, modified: {result.modified_count}")
        else:
            logger.warning(f"Could not find pending userData entry for {email} to mark as processed.")
    except Exception as e:
        logger.error(f"Failed to update userData status for {email}: {str(e)}")

    # --- Run Demographic Inference (After main processing) ---
    inference_updated_user = False
    try:
        logger.info(f"Starting demographic inference for user {email} ({user_id})")
        inference_updated_user = await run_inference_for_user(user_id, email, db)
        if inference_updated_user:
             logger.info(f"Demographic inference updated user document for {email}")
             # Cache invalidation is handled within run_inference_for_user
        else:
             logger.info(f"Demographic inference did not result in updates for user {email}")
    except Exception as inference_error:
        logger.error(f"Demographic inference failed for user {email}: {inference_error}", exc_info=True)
    # --- End Demographic Inference ---


    # Invalidate user preferences cache using auth0Id (if not already done by inference)
    # This ensures caches are cleared even if inference didn't run or update
    auth0_id = user.get("auth0Id")
    if auth0_id:
        # Check if inference already invalidated caches for this user
        if not inference_updated_user:
            logger.info(f"Running post-processing cache invalidation for {auth0_id} as inference didn't update.")
            await invalidate_cache(f"{CACHE_KEYS['PREFERENCES']}{auth0_id}")
            logger.info(f"Invalidated PREFERENCES cache for user {auth0_id} (post-processing)")

            # Invalidate store-specific caches if opt-in stores exist
            if user.get("privacySettings", {}).get("optInStores"):
                for store_id in user["privacySettings"]["optInStores"]:
                     store_pref_key = f"{CACHE_KEYS['STORE_PREFERENCES']}{user_id}:{store_id}"
                     await invalidate_cache(store_pref_key)
                logger.info(f"Invalidated STORE_PREFERENCES caches for user {auth0_id} (post-processing)")
        else:
             logger.info(f"Skipping post-processing cache invalidation as inference already handled it for {auth0_id}")
    else:
        logger.warning(f"Cannot invalidate caches for user {email} as auth0Id is missing.")


    # Return updated preferences in the expected format
    return UserPreferences(
        user_id=user_id,
        preferences=[
            UserPreference(
                category=item["category"],
                score=item["score"],
                attributes=item.get("attributes")
            ) for item in normalized_preferences # Use normalized preferences
        ],
        updated_at=update_time # Use the time of this update
    )

# ... process_purchase_data, process_search_data, process_with_embeddings, normalize_categories ...
# (No changes needed inside these functions as they receive the flattened demographics dict)

# --- Add helper for marking failed ---
async def mark_processing_failed(db, email: str):
    """Marks the oldest pending userData entry for the email as failed."""
    try:
        result = await db.userData.update_one(
            {"email": email, "processedStatus": "pending"},
            {"$set": {"processedStatus": "failed"}},
            # sort={"timestamp": 1} # Optional: ensure oldest is marked if multiple exist
        )
        if result.modified_count > 0:
            logger.info(f"Marked a pending userData entry as 'failed' for {email}")
        else:
            logger.warning(f"Could not find pending userData entry for {email} to mark as failed.")
    except Exception as e:
        logger.error(f"Failed to mark userData as failed for {email}: {str(e)}")

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
    # --- Add inferred data ---
    has_kids = demographics.get("inferredHasKids") # Boolean or None
    relationship_status = demographics.get("inferredRelationshipStatus") # String or None
    # --- Add NEW inferred data ---
    employment_status = demographics.get("inferredEmploymentStatus") # String or None
    education_level = demographics.get("inferredEducationLevel") # String or None
    age_bracket = demographics.get("inferredAgeBracket") # String or None
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
                boost_factor *= 1.1 # Boost common female-associated categories
            elif gender == "male" and category_name in ["Electronics", "Tools", "Laptops"]:
                boost_factor *= 1.05 # Slightly boost common male-associated categories
            if age:
                # Boost tech/gaming for younger adults
                if 18 <= age <= 30 and category_name in ["Smartphones", "Wearables", "Audio", "Gaming"]:
                     boost_factor *= 1.05
                # Boost health/home for older adults
                elif age >= 50 and category_name in ["Health", "Home"]:
                     boost_factor *= 1.08 # Slightly higher boost for potential health needs

            # --- Apply inferred demographic boosts ---
            if has_kids is True and category_name in ["Toys", "Baby", "Kids Clothing"]: # Add relevant categories
                boost_factor *= 1.15 # Stronger boost for likely parents in child-related categories
                logger.debug(f"Applying 'has_kids' boost to category {category_name}")

            if relationship_status == "married" and category_name in ["Home Goods", "Furniture", "Jewelry"]: # Example categories
                 boost_factor *= 1.05 # Slight boost for categories related to shared living/gifting
                 logger.debug(f"Applying 'married' boost to category {category_name}")

            # --- Apply NEW inferred boosts (Examples) ---
            if employment_status == "student" and category_name in ["Laptops", "Books", "Stationery", "Budget Food"]: # Add relevant categories
                boost_factor *= 1.1 # Boost student-related items
                logger.debug(f"Applying 'student' boost to category {category_name}")
            if employment_status == "employed" and category_name in ["Business Wear", "Office Supplies", "Travel"]: # Add relevant categories
                boost_factor *= 1.05 # Slight boost for work-related items
                logger.debug(f"Applying 'employed' boost to category {category_name}")

            if education_level in ["masters", "doctorate"] and category_name in ["Books", "Academic Journals", "Software"]: # Add relevant categories
                boost_factor *= 1.08 # Speculative boost for academic/professional interests
                logger.debug(f"Applying 'higher_education' boost to category {category_name}")

            # Use inferred age bracket ONLY if actual age is missing
            effective_age_info = age if age is not None else age_bracket
            if effective_age_info:
                 # Example using age bracket (less precise than actual age)
                 if effective_age_info == "18-24" and category_name in ["Fast Fashion", "Gaming", "Streaming Services"]:
                     boost_factor *= 1.05 # Boost categories popular with young adults
                     logger.debug(f"Applying '18-24' boost to category {category_name}")
                 elif effective_age_info == "65+" and category_name in ["Health", "Gardening", "Comfort Footwear"]:
                     boost_factor *= 1.1 # Boost categories relevant to seniors
                     logger.debug(f"Applying '65+' boost to category {category_name}")
            # --- End NEW inferred boosts ---

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

                        # --- Apply inferred attribute boosts ---
                        if has_kids is True and attr_name == "size" and category_name == "Clothing" and value in ["kids", "toddler", "infant"]:
                            attribute_boost *= 1.2 # Boost kids sizes if kids inferred
                            logger.debug(f"Applying 'has_kids' boost to attribute {attr_name}={value}")

                        # Example: Boost 'gift' attribute if relationship status is known?
                        # if relationship_status in ["relationship", "married"] and attr_name == "purpose" and value == "gift":
                        #    attribute_boost *= 1.1
                        # --- End inferred attribute boosts ---

                        # --- Apply NEW inferred attribute boosts (Examples) ---
                        if employment_status == "student" and attr_name == "price_range" and value == "budget":
                            attribute_boost *= 1.15 # Boost budget items for students
                            logger.debug(f"Applying 'student' boost to attribute {attr_name}={value}")
                        if employment_status == "student" and attr_name == "usage_type" and category_name == "Laptops" and value == "student":
                            attribute_boost *= 1.1
                            logger.debug(f"Applying 'student' boost to attribute {attr_name}={value}")

                        if education_level in ["masters", "doctorate"] and attr_name == "genre" and category_name == "Books" and value in ["non_fiction", "history", "science"]:
                            attribute_boost *= 1.1 # Boost non-fiction for higher education
                            logger.debug(f"Applying 'higher_education' boost to attribute {attr_name}={value}")

                        # Example using age bracket for attribute
                        if age is None and age_bracket == "18-24" and attr_name == "brand" and category_name == "Fashion" and value in ["H&M", "Zara", "ASOS"]: # Example fast fashion brands
                            attribute_boost *= 1.1
                            logger.debug(f"Applying '18-24' boost to attribute {attr_name}={value}")
                        # --- End NEW inferred attribute boosts ---

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
    # --- Add inferred data ---
    has_kids = demographics.get("inferredHasKids")
    relationship_status = demographics.get("inferredRelationshipStatus")
    # --- Add NEW inferred data ---
    employment_status = demographics.get("inferredEmploymentStatus")
    education_level = demographics.get("inferredEducationLevel")
    age_bracket = demographics.get("inferredAgeBracket")
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

            # --- Apply inferred boosts ---
            if has_kids is True and category_name in ["Toys", "Baby", "Kids Clothing"]:
                relevance_boost *= 1.15
                logger.debug(f"Applying 'has_kids' boost to search relevance for {category_name}")

            if relationship_status == "married" and category_name in ["Home Goods", "Furniture", "Jewelry"]:
                 relevance_boost *= 1.05
                 logger.debug(f"Applying 'married' boost to search relevance for {category_name}")

            # --- Apply NEW inferred boosts (Examples) ---
            if employment_status == "student" and category_name in ["Laptops", "Books", "Stationery"]:
                relevance_boost *= 1.1
            if education_level in ["masters", "doctorate"] and category_name in ["Books", "Academic Journals"]:
                relevance_boost *= 1.08

            effective_age_info = age if age is not None else age_bracket
            if effective_age_info:
                 if effective_age_info == "18-24" and category_name in ["Fast Fashion", "Gaming"]:
                     relevance_boost *= 1.05
                 elif effective_age_info == "65+" and category_name in ["Health", "Gardening"]:
                     relevance_boost *= 1.1
            # --- End NEW inferred boosts ---

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
    # --- Add inferred data ---
    has_kids = demographics.get("inferredHasKids")
    relationship_status = demographics.get("inferredRelationshipStatus")
    # --- Add NEW inferred data ---
    employment_status = demographics.get("inferredEmploymentStatus")
    education_level = demographics.get("inferredEducationLevel")
    age_bracket = demographics.get("inferredAgeBracket")
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

                    # --- Apply inferred boosts ---
                    if has_kids is True and category_name in ["Toys", "Baby", "Kids Clothing"]:
                        boost_factor *= 1.15
                    if relationship_status == "married" and category_name in ["Home Goods", "Furniture", "Jewelry"]:
                         boost_factor *= 1.05

                    # --- Apply NEW inferred boosts (Examples) ---
                    if employment_status == "student" and category_name in ["Laptops", "Books"]:
                        boost_factor *= 1.1
                    if education_level in ["masters", "doctorate"] and category_name in ["Books"]:
                        boost_factor *= 1.08

                    effective_age_info = age if age is not None else age_bracket
                    if effective_age_info:
                         if effective_age_info == "18-24" and category_name in ["Gaming"]:
                             boost_factor *= 1.05
                         elif effective_age_info == "65+" and category_name in ["Health"]:
                             boost_factor *= 1.1
                    # --- End NEW inferred boosts ---

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