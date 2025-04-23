import logging
from app.models.preferences import UserDataEntry, UserPreferences, UserPreference
from datetime import datetime
from fastapi import HTTPException
from bson import ObjectId
from app.utils.redis_util import invalidate_cache, CACHE_KEYS
from typing import List, Dict, Any, Optional
from app.services.taxonomyService import TaxonomyService, get_taxonomy_service # Updated import
from collections import defaultdict
from app.services.demographicInference import run_inference_for_user # Import the inference runner
from sentence_transformers import util # Import sentence-transformers utility for similarity
import numpy as np # Import numpy

logger = logging.getLogger(__name__)

# --- Configuration ---
ATTRIBUTE_SIMILARITY_THRESHOLD = 0.55 # Configurable threshold for matching attribute values

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

async def process_purchase_data(entries, preference_dict, taxonomy: TaxonomyService, demographics: Optional[Dict[str, Any]] = None):
    """Process purchase data using rule-based system, considering demographics and buying patterns"""
    category_counts = defaultdict(int)
    attribute_counts = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    category_price_totals = defaultdict(float)
    category_item_counts = defaultdict(int)

    # --- Demographic Usage (remains the same) ---
    demographics = demographics or {}
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
            category_input = item.get("category") # Can be ID or Name
            item_name = item.get("name")
            quantity = item.get("quantity", 1)
            price = item.get("price")
            provided_attributes = item.get("attributes") # Attributes from the store

            if not category_input or not item_name:
                logger.warning(f"Skipping item due to missing category or name: {item}")
                continue

            # --- Resolve Category ID ---
            category_id = None
            if taxonomy.taxonomy: # Check if taxonomy is loaded
                # Try direct ID lookup first
                if category_input in taxonomy._id_to_name_map:
                    category_id = category_input
                else:
                    # Try name lookup (case-insensitive)
                    category_id = taxonomy.get_category_id(category_input)

            if not category_id:
                logger.warning(f"Could not resolve category '{category_input}' for item '{item_name}'. Skipping attribute processing for this item.")
                # Decide if you still want to count the category score even if attributes can't be processed
                # For now, we skip attribute processing but might still count category later if needed
                continue # Skip attribute part if category is unresolved
            # --- End Resolve Category ID ---


            # --- Hybrid Attribute Logic ---
            final_attributes = None
            is_valid_provided = False

            # 1. Check if store provided valid attributes
            if provided_attributes and isinstance(provided_attributes, dict):
                try:
                    # Basic validation: Check if keys exist in taxonomy for this category
                    category_details = taxonomy.get_category_details(category_id)
                    if category_details and category_details.attributes:
                        valid_attr_names = {attr.name for attr in category_details.attributes}
                        # Check if all provided keys are valid attribute names for the category
                        is_valid_provided = all(key in valid_attr_names for key in provided_attributes.keys())
                        if is_valid_provided:
                            final_attributes = provided_attributes
                            logger.debug(f"Using valid store-provided attributes for item: {item_name}")
                        else:
                            invalid_keys = [key for key in provided_attributes.keys() if key not in valid_attr_names]
                            logger.warning(f"Invalid attribute keys provided by store for item '{item_name}' in category '{category_id}': {invalid_keys}. Falling back to AI.")
                    else:
                         logger.warning(f"No attributes defined in taxonomy for category '{category_id}', cannot validate provided attributes for '{item_name}'. Falling back to AI.")
                         is_valid_provided = False # Cannot validate

                except Exception as val_err:
                    logger.warning(f"Error validating provided attributes for {item_name}: {val_err}. Falling back to AI.")
                    is_valid_provided = False

            # 2. Fallback to AI extraction if needed
            if not final_attributes:
                logger.debug(f"Attempting AI attribute extraction for item: {item_name}")
                try:
                    # Call the AI extraction function using the embedding model
                    extracted_attributes = await extract_attributes_with_similarity(
                        item_name, category_id, taxonomy # Pass taxonomy service
                    )
                    if extracted_attributes:
                         final_attributes = extracted_attributes
                         logger.info(f"Successfully extracted attributes via AI for '{item_name}': {final_attributes}") # Log success
                    else:
                         logger.debug(f"AI could not extract attributes for {item_name}")
                except Exception as ai_err:
                    logger.error(f"AI attribute extraction failed for {item_name}: {ai_err}", exc_info=True)
                    final_attributes = None # Ensure it's None on failure

            # --- End Hybrid Attribute Logic ---

            # --- Update Category Counts (Moved here to ensure category_id is valid) ---
            category_counts[category_id] += quantity
            if price is not None:
                category_price_totals[category_id] += price * quantity
            category_item_counts[category_id] += quantity
            # --- End Update Category Counts ---


            # --- Attribute Scoring (Using final_attributes) ---
            if final_attributes:
                for attr_name, attr_value in final_attributes.items():
                    # Ensure attr_value is a string (as expected from store or AI extraction)
                    if isinstance(attr_value, str):
                        value_str = attr_value.lower() # Normalize to lower case
                        attribute_counts[category_id][attr_name][value_str] += quantity
                    else:
                        logger.warning(f"Skipping attribute scoring for non-string value: {attr_name}={attr_value} in item '{item_name}'")
            # --- End Attribute Scoring ---


    # --- Update preference scores (Category level - remains the same) ---
    total_items_overall = sum(category_counts.values())
    if total_items_overall > 0:
        for category_id, count in category_counts.items():
            # --- Category Score Calculation (remains largely the same) ---
            base_score = min(count / (total_items_overall * 0.5), 1.0)
            boost_factor = 1.0
            category_name = taxonomy.get_category_name(category_id)

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
            if category_id not in preference_dict:
                preference_dict[category_id] = {
                    "category": category_id,
                    "score": final_score,
                    "attributes": {}
                }
            else:
                alpha = 0.3
                old_score = preference_dict[category_id]["score"]
                preference_dict[category_id]["score"] = alpha * final_score + (1 - alpha) * old_score
            # --- End Category Score Calculation ---


    # --- Update preference scores (Attribute level - Adjusted) ---
    for category_id, attrs in attribute_counts.items():
        if category_id in preference_dict: # Ensure category exists
            if "attributes" not in preference_dict[category_id] or preference_dict[category_id]["attributes"] is None:
                 preference_dict[category_id]["attributes"] = {} # Initialize if missing

            for attr_name, values in attrs.items():
                if attr_name not in preference_dict[category_id]["attributes"]:
                     preference_dict[category_id]["attributes"][attr_name] = {} # Initialize specific attribute dict

                total_attr_count = sum(values.values())
                if total_attr_count > 0:
                    current_attr_prefs = preference_dict[category_id]["attributes"][attr_name]
                    # Decay existing scores slightly
                    for val, score in current_attr_prefs.items():
                        current_attr_prefs[val] = max(0.0, score * 0.9) # Decay factor

                    # Add new scores based on counts
                    for value_str, count in values.items():
                        new_score_contribution = (count / total_attr_count) * 0.5 # Contribution weight
                        current_score = current_attr_prefs.get(value_str, 0.0)
                        current_attr_prefs[value_str] = min(1.0, current_score + new_score_contribution)

                    # Normalize scores within the attribute so they sum roughly to 1 (optional but good practice)
                    total_score = sum(current_attr_prefs.values())
                    if total_score > 0:
                        for val in current_attr_prefs:
                            current_attr_prefs[val] /= total_score
    # --- End Update preference scores (Attribute level) ---


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

async def extract_attributes_with_similarity(item_name: str, category_id: str, taxonomy_service: TaxonomyService) -> Optional[Dict[str, str]]:
    """
    Uses the semantic embedding model to extract attributes for an item by comparing
    the item name to potential attribute values defined in the taxonomy.
    Returns a dictionary like {"color": "blue", "size": "M"} or None.
    """
    if not taxonomy_service.embedding_model:
        logger.warning("AI Extraction: Embedding model not available in TaxonomyService.")
        return None

    logger.debug(f"AI Extraction: Processing '{item_name}' in category '{category_id}'")
    extracted = {}

    # 1. Get category details and expected attributes/values
    category_details = taxonomy_service.get_category_details(category_id)
    if not category_details or not category_details.attributes:
        logger.debug(f"AI Extraction: No attributes defined in taxonomy for category {category_id}")
        return None

    # Prepare list of attributes and their potential values for this category
    attributes_to_check = []
    for attr in category_details.attributes:
        if attr.values: # Only consider attributes with defined values
            attributes_to_check.append({"name": attr.name, "values": attr.values})

    if not attributes_to_check:
        logger.debug(f"AI Extraction: No attributes with values defined for category {category_id}")
        return None

    logger.debug(f"AI Extraction: Expected attributes for {category_id}: {[a['name'] for a in attributes_to_check]}")

    try:
        # 2. Generate embedding for the item name
        item_embedding = taxonomy_service.embedding_model.encode(item_name.lower(), convert_to_tensor=True)

        # 3. Iterate through attributes and their values
        for attribute_info in attributes_to_check:
            attr_name = attribute_info["name"]
            possible_values = attribute_info["values"]

            if not possible_values:
                continue

            # Generate embeddings for all possible values of this attribute
            value_embeddings = taxonomy_service.embedding_model.encode([v.lower() for v in possible_values], convert_to_tensor=True)

            # Calculate cosine similarities between item name and all values
            # Use pytorch_cos_sim for efficiency
            similarities = util.pytorch_cos_sim(item_embedding, value_embeddings)[0] # Get the first row (item vs all values)

            # Find the value with the highest similarity
            best_match_idx = similarities.argmax().item() # Get index of max value
            highest_similarity = similarities[best_match_idx].item() # Get the max similarity score

            logger.debug(f"AI Extraction: Attribute '{attr_name}', Best match: '{possible_values[best_match_idx]}', Score: {highest_similarity:.4f}")

            # 4. Check against threshold and store if match is strong enough
            if highest_similarity >= ATTRIBUTE_SIMILARITY_THRESHOLD:
                best_match_value = possible_values[best_match_idx]
                # Simple conflict resolution: If we already extracted a value for this attribute,
                # only overwrite if the new score is significantly higher (e.g., > 0.1 difference).
                # A more complex approach could consider multiple high-scoring values.
                if attr_name in extracted:
                     # We need the previous score to compare - this simple approach just takes the first good match.
                     # For improvement, store scores alongside values during iteration.
                     logger.debug(f"AI Extraction: Attribute '{attr_name}' already extracted ('{extracted[attr_name]}'). Keeping first match above threshold.")
                else:
                    extracted[attr_name] = best_match_value
                    logger.debug(f"AI Extraction: Extracted '{attr_name}' = '{best_match_value}' (Score: {highest_similarity:.4f})")


    except Exception as e:
        logger.error(f"AI Extraction: Error during embedding/similarity calculation for '{item_name}': {e}", exc_info=True)
        return None

    if not extracted:
        logger.debug(f"AI Extraction: No attributes met threshold for '{item_name}'")
        return None

    return extracted