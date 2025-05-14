import logging
from app.models.preferences import UserDataEntry, UserPreferences, UserPreference
from datetime import datetime
from fastapi import HTTPException
from bson import ObjectId
from app.utils.redis_util import invalidate_cache, CACHE_KEYS
from typing import List, Dict, Any, Optional, Set # Added Set
from app.services.taxonomyService import TaxonomyService, get_taxonomy_service
from collections import defaultdict
from app.services.demographicInference import run_inference_for_user
from sentence_transformers import util # Import sentence-transformers utility for similarity
import numpy as np # Import numpy

logger = logging.getLogger(__name__)

# --- Configuration for Preference Scoring and Decay ---
MAX_INFERRED_SCORE = 0.95  # Max score for preferences derived from behavior/inference
DECAY_FACTOR = 0.98        # Factor to apply for decay (e.g., 2% decay if not reinforced)
MIN_SCORE_THRESHOLD = 0.05 # Inferred preferences below this score are removed
# --- End New Configuration ---

# --- Original Configuration ---
ATTRIBUTE_SIMILARITY_THRESHOLD = 0.55 # Configurable threshold for matching attribute values


async def _update_preference_score(
    preference_dict: Dict[str, Dict[str, Any]],
    category_id: str,
    increment: float,
    taxonomy: TaxonomyService, # Added for potential use
    demographics: Optional[Dict[str, Any]] = None # Added for potential use
):
    """Helper to update score for a category, respecting new capping rules."""
    current_pref = preference_dict.get(category_id)
    if not current_pref:
        # Initialize if new, ensuring 'is_explicit_score' is False by default
        current_pref = {"category": category_id, "score": 0.0, "attributes": {}, "is_explicit_score": False}
        preference_dict[category_id] = current_pref
    
    is_explicit = current_pref.get("is_explicit_score", False)

    if is_explicit:
        current_pref["score"] = 1.0 # Explicit 1.0 scores are not changed by increments
        logger.debug(f"Category {category_id}: Score is explicit (1.0), not changing with increment.")
    else:
        # Apply demographic boost or other logic to increment if needed here
        # Example: if demographics and "children" in taxonomy.get_category_name(category_id).lower(): increment *= 1.1
        
        new_score = min(MAX_INFERRED_SCORE, current_pref["score"] + increment)
        current_pref["score"] = new_score
        logger.debug(f"Category {category_id}: Updated score to {new_score} (increment: {increment}, capped at {MAX_INFERRED_SCORE}).")
    
    # preference_dict[category_id] = current_pref # Already modifying in place if current_pref was from dict


async def process_purchase_data(
    entries: List[Dict[str, Any]],
    preference_dict: Dict[str, Dict[str, Any]],
    taxonomy: TaxonomyService,
    demographics: Optional[Dict[str, Any]] = None,
    categories_updated_this_run: Optional[Set[str]] = None
):
    """Process purchase data using rule-based system, considering demographics and buying patterns"""
    if categories_updated_this_run is None:
        categories_updated_this_run = set()

    category_counts = defaultdict(int)
    attribute_counts = defaultdict(lambda: defaultdict(lambda: defaultdict(int))) # category -> attr_name -> attr_value -> count
    # category_price_totals = defaultdict(float) # Not used in current logic, can be added if needed
    # category_item_counts = defaultdict(int) # Not used in current logic, can be added if needed

    for entry in entries:
        for item in entry.get("items", []):
            category_input = item.get("category")
            item_name = item.get("name")
            # quantity = item.get("quantity", 1) # Not directly used for scoring yet
            # price = item.get("price") # Not directly used for scoring yet
            provided_attributes = item.get("attributes")

            if not category_input and not item_name:
                logger.debug(f"Skipping item due to missing category and name: {item}")
                continue
            
            category_id = None
            if category_input:
                # Try direct ID lookup first
                if taxonomy.get_category_name(category_input): # Validates if category_input is an ID
                    category_id = category_input
                else: # Assume it's a name
                    category_id = taxonomy.get_category_id(category_input)
            
            if not category_id and item_name: # Fallback to matching item name if category not resolved
                match_result = await taxonomy.match_category(item_name)
                if match_result and match_result.get("category") and match_result.get("threshold_met"):
                    category_id = match_result["category"]
                    logger.debug(f"Item '{item_name}' matched to category '{category_id}' via embedding.")

            if not category_id:
                logger.debug(f"Could not resolve category for item '{item_name}' (input: '{category_input}'). Skipping item.")
                continue

            category_counts[category_id] += 1
            categories_updated_this_run.add(category_id) # Mark category as updated

            # Process attributes
            final_attributes_for_item = None
            if provided_attributes and isinstance(provided_attributes, dict):
                # Basic validation: ensure attributes are somewhat structured.
                # More advanced validation against taxonomy.get_category_details(category_id).attributes can be added.
                final_attributes_for_item = provided_attributes
            elif item_name: # If no attributes provided, try to extract them
                logger.debug(f"Attempting AI attribute extraction for item '{item_name}' in category '{category_id}'.")
                final_attributes_for_item = await extract_attributes_with_similarity(item_name, category_id, taxonomy)

            if final_attributes_for_item:
                for attr_name, attr_value in final_attributes_for_item.items():
                    if isinstance(attr_value, str): # Simple case: direct value
                        attribute_counts[category_id][attr_name][attr_value] += 1
                    # Can extend to handle list of values, etc.

    total_items_overall = sum(category_counts.values())
    if total_items_overall > 0:
        for category_id, count in category_counts.items():
            increment = (count / total_items_overall) * 0.5  # Base increment factor for purchases
            await _update_preference_score(preference_dict, category_id, increment, taxonomy, demographics)

    for category_id, attrs_data in attribute_counts.items():
        if category_id in preference_dict:
            pref_for_attributes = preference_dict[category_id]
            if "attributes" not in pref_for_attributes or pref_for_attributes["attributes"] is None:
                pref_for_attributes["attributes"] = {}
            
            for attr_name, value_counts in attrs_data.items():
                if attr_name not in pref_for_attributes["attributes"]:
                    pref_for_attributes["attributes"][attr_name] = {}
                
                total_attr_occurrences_for_value = sum(value_counts.values())
                if total_attr_occurrences_for_value > 0:
                    for attr_value, count in value_counts.items():
                        current_attr_score = pref_for_attributes["attributes"][attr_name].get(attr_value, 0.0)
                        attr_increment = (count / total_attr_occurrences_for_value) * 0.1 # Smaller increment for attributes
                        
                        # Attribute scores are always capped at MAX_INFERRED_SCORE
                        new_attr_score = min(MAX_INFERRED_SCORE, current_attr_score + attr_increment)
                        pref_for_attributes["attributes"][attr_name][attr_value] = new_attr_score
                        logger.debug(f"Category {category_id}, Attr {attr_name}.{attr_value}: Updated score to {new_attr_score}.")


async def process_search_data(
    entries: List[Dict[str, Any]],
    preference_dict: Dict[str, Dict[str, Any]],
    taxonomy: TaxonomyService,
    demographics: Optional[Dict[str, Any]] = None,
    categories_updated_this_run: Optional[Set[str]] = None
):
    """Process search data using embedding model, considering demographics"""
    if categories_updated_this_run is None:
        categories_updated_this_run = set()
    
    # demographics = demographics or {} # Available if needed for boosting

    for entry in entries:
        query = entry.get("query")
        provided_category_id = entry.get("category") # Category explicitly sent with search
        matched_category_id = None
        match_score = 0.0

        if not query and not provided_category_id:
            logger.debug("Search entry with no query and no category, skipping.")
            continue

        if provided_category_id and taxonomy.get_category_name(provided_category_id): # Validate ID
            matched_category_id = provided_category_id
            match_score = 0.9 # High confidence if category provided and valid
        elif query:
            match_result = await taxonomy.match_category(query)
            if match_result and match_result.get("category") and match_result.get("threshold_met"):
                matched_category_id = match_result["category"]
                match_score = match_result["score"]
        
        if matched_category_id:
            categories_updated_this_run.add(matched_category_id)
            base_increment = match_score * 0.3 # Base increment factor for search
            # Example: Boost increment if search led to many results or clicks
            # if entry.get("results", 0) > 5 or entry.get("clicked"): base_increment *= 1.1
            await _update_preference_score(preference_dict, matched_category_id, base_increment, taxonomy, demographics)
            logger.debug(f"Search query '{query or provided_category_id}' matched category {matched_category_id} with score {match_score}, increment {base_increment}.")


async def process_with_embeddings(
    entries: List[Dict[str, Any]],
    data_type: str,
    preference_dict: Dict[str, Dict[str, Any]],
    taxonomy: TaxonomyService,
    demographics: Optional[Dict[str, Any]] = None,
    categories_updated_this_run: Optional[Set[str]] = None
):
    """Fallback processing using embeddings, potentially considering demographics"""
    if categories_updated_this_run is None:
        categories_updated_this_run = set()
    logger.info(f"Using embedding fallback processing for data_type: {data_type}")
    
    # demographics = demographics or {} # Available if needed

    if data_type == "purchase":
        item_names_for_embedding = []
        for entry in entries:
            for item in entry.get("items", []):
                if item.get("name"):
                    item_names_for_embedding.append(item["name"])
        
        for item_name in item_names_for_embedding:
            match_result = await taxonomy.match_category(item_name)
            if match_result and match_result.get("category") and match_result.get("threshold_met"):
                category_id = match_result["category"]
                categories_updated_this_run.add(category_id)
                increment = match_result["score"] * 0.2 # Increment based on match score for embedding fallback
                await _update_preference_score(preference_dict, category_id, increment, taxonomy, demographics)
                logger.debug(f"Fallback purchase item '{item_name}' matched category {category_id}, increment {increment}.")
    elif data_type == "search":
        # Fallback for search can re-use process_search_data or have specific embedding logic
        await process_search_data(entries, preference_dict, taxonomy, demographics, categories_updated_this_run)


async def normalize_categories(preferences: List[Dict[str, Any]], taxonomy: TaxonomyService) -> List[Dict[str, Any]]:
    """Ensure all categories use IDs instead of names and are valid."""
    normalized = []
    if not taxonomy.taxonomy:
        logger.error("Cannot normalize categories: Taxonomy not loaded.")
        return preferences # Return as is if taxonomy is unavailable

    valid_category_ids = {cat.id for cat in taxonomy.taxonomy.categories}
    
    for pref_item in preferences:
        category_key = pref_item.get("category")
        resolved_category_id = None

        if category_key in valid_category_ids:
            resolved_category_id = category_key
        elif isinstance(category_key, str): # Could be a name
            cat_id_from_name = taxonomy.get_category_id(category_key)
            if cat_id_from_name and cat_id_from_name in valid_category_ids:
                resolved_category_id = cat_id_from_name
                logger.debug(f"Normalized category name '{category_key}' to ID '{resolved_category_id}'.")
        
        if resolved_category_id:
            pref_item["category"] = resolved_category_id # Ensure it's the ID
            normalized.append(pref_item)
        else:
            logger.warning(f"Skipping preference for unknown/invalid category '{category_key}' during normalization.")
            
    return normalized


async def extract_attributes_with_similarity(item_name: str, category_id: str, taxonomy_service: TaxonomyService) -> Optional[Dict[str, str]]:
    """
    Uses the semantic embedding model to extract attributes for an item by comparing
    the item name to potential attribute values defined in the taxonomy.
    Returns a dictionary like {"color": "blue", "size": "M"} or None.
    """
    if not taxonomy_service.embedding_model:
        logger.warning("AI Attribute Extraction: Embedding model not available in TaxonomyService.")
        return None

    logger.debug(f"AI Attribute Extraction: Processing '{item_name}' in category '{category_id}'")
    extracted_attributes = {}

    category_details = taxonomy_service.get_category_details(category_id)
    if not category_details or not category_details.attributes:
        logger.debug(f"AI Attribute Extraction: No attributes defined for category '{category_id}'.")
        return None

    item_name_embedding = taxonomy_service.embedding_model.encode(item_name.lower())

    for attribute_def in category_details.attributes:
        best_value_for_attr = None
        highest_similarity = -1.0

        for value in attribute_def.values:
            # Compare item_name with "attribute_name value" for better context, or just value
            # For simplicity, comparing item_name directly to value.
            # Contextual phrase: f"{attribute_def.name} {value}"
            value_embedding = taxonomy_service.embedding_model.encode(value.lower())
            similarity = util.pytorch_cos_sim(item_name_embedding, value_embedding).item()

            if similarity > highest_similarity:
                highest_similarity = similarity
                best_value_for_attr = value
        
        if best_value_for_attr and highest_similarity >= ATTRIBUTE_SIMILARITY_THRESHOLD:
            extracted_attributes[attribute_def.name] = best_value_for_attr
            logger.debug(f"AI Attribute Extraction: Matched '{item_name}' to attribute '{attribute_def.name}: {best_value_for_attr}' (Similarity: {highest_similarity:.2f})")

    if not extracted_attributes:
        logger.debug(f"AI Attribute Extraction: No attributes extracted for '{item_name}' above threshold {ATTRIBUTE_SIMILARITY_THRESHOLD}.")
        return None
    
    return extracted_attributes


async def mark_processing_failed(db, email: str, submission_id: Optional[str] = None):
    """Marks a specific userData entry or the oldest pending one for the email as failed."""
    try:
        match_criteria = {"email": email, "processedStatus": "pending"}
        if submission_id and ObjectId.is_valid(submission_id):
            match_criteria["_id"] = ObjectId(submission_id)
        
        # If no specific ID, update_one will target one matching document.
        # To target the "oldest" without a specific ID, a sort would be needed with find_one_and_update,
        # or a separate find with sort then update. update_one is simpler if any pending is fine.
        result = await db.userData.update_one(
            match_criteria,
            {"$set": {"processedStatus": "failed"}},
        )
        if result.modified_count > 0:
            logger.info(f"Marked userData as failed for {email} (Submission ID: {submission_id if submission_id else 'Oldest Pending'}). Modified: {result.modified_count}")
        else:
            logger.warning(f"No matching pending userData found to mark as failed for {email} (Submission ID: {submission_id}). Criteria: {match_criteria}")
    except Exception as e:
        logger.error(f"Failed to mark userData as failed for {email} (Submission ID: {submission_id}): {str(e)}")


async def process_user_data(data: UserDataEntry, db) -> UserPreferences:
    """Process user data and update their preferences with decay for inferred scores"""

    user_id_from_meta = data.metadata.get("userId") if data.metadata else None
    email = data.email
    data_type = data.data_type
    entries = data.entries
    submission_id = data.metadata.get("submissionId") if data.metadata else None # For marking specific entry

    logger.info(f"Processing data for user email {email} (ID from meta: {user_id_from_meta}), type: {data_type}, submission: {submission_id}")

    user = None
    if user_id_from_meta and ObjectId.is_valid(user_id_from_meta):
        user = await db.users.find_one({"_id": ObjectId(user_id_from_meta)})
        if user and user.get("email") != email:
            logger.warning(f"User ID {user_id_from_meta} from metadata does not match email {email}. Falling back to email lookup.")
            user = None

    if not user:
        user = await db.users.find_one({"email": email})
        if not user:
            logger.error(f"User not found with email {email}. Cannot process data.")
            await mark_processing_failed(db, email, submission_id) # Mark as failed before raising
            raise HTTPException(status_code=404, detail=f"User not found: {email}")

    user_id = str(user["_id"])
    logger.info(f"Found user {email} with DB ID {user_id}")

    privacy_settings = user.get("privacySettings", {})
    allow_inference_setting = privacy_settings.get("allowInference", True)
    user_demographics_nested = user.get("demographicData", {})
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
    logger.debug(f"Using demographics for user {email}: {user_demographics_flat}")

    user_preferences_initial = user.get("preferences", [])
    preference_dict: Dict[str, Dict[str, Any]] = {}
    for pref_item in user_preferences_initial:
        if isinstance(pref_item, dict) and "category" in pref_item:
            attributes_data = pref_item.get("attributes", {})
            if not isinstance(attributes_data, dict):
                logger.warning(f"User {email}, category {pref_item['category']}: attributes field is not a dict, re-initializing. Value: {attributes_data}")
                attributes_data = {}
            
            current_score = pref_item.get("score", 0.0)
            preference_dict[pref_item["category"]] = {
                "category": pref_item["category"],
                "score": current_score,
                "attributes": attributes_data,
                "is_explicit_score": current_score == 1.0 # Flag if score is 1.0 initially
            }
        else:
            logger.warning(f"Skipping invalid preference item for user {email}: {pref_item}")

    taxonomy = await get_taxonomy_service(db)
    if not taxonomy.taxonomy: # Critical check
        logger.error(f"Taxonomy not loaded. Aborting preference processing for user {email}.")
        await mark_processing_failed(db, email, submission_id)
        raise HTTPException(status_code=500, detail="Taxonomy service not available, cannot process preferences.")

    categories_updated_this_run: Set[str] = set()

    try:
        if data_type == "purchase":
            await process_purchase_data(entries, preference_dict, taxonomy, user_demographics_flat, categories_updated_this_run)
        elif data_type == "search":
            await process_search_data(entries, preference_dict, taxonomy, user_demographics_flat, categories_updated_this_run)
        else:
            logger.warning(f"Unknown data type '{data_type}' for user {email}. Attempting embedding fallback.")
            await process_with_embeddings(entries, data_type, preference_dict, taxonomy, user_demographics_flat, categories_updated_this_run)
    except Exception as e:
        logger.error(f"Error processing {data_type} data for {email}: {str(e)}", exc_info=True)
        try:
            logger.info(f"Attempting fallback embedding processing for {data_type} data for user {email} after error.")
            await process_with_embeddings(entries, data_type, preference_dict, taxonomy, user_demographics_flat, categories_updated_this_run)
        except Exception as fallback_error:
            logger.error(f"Fallback embedding processing also failed for {email}: {fallback_error}", exc_info=True)
            await mark_processing_failed(db, email, submission_id)
            raise HTTPException(status_code=500, detail=f"Processing failed for {email}: {str(e)}")

    # --- Apply Decay and Removal Logic ---
    final_preference_list_for_db = []
    for category_id, pref_data in list(preference_dict.items()): # Iterate over a copy for safe removal
        current_score = pref_data["score"]
        is_explicit = pref_data.get("is_explicit_score", False)

        if is_explicit:
            pref_data["score"] = 1.0 # Ensure it remains 1.0
            logger.debug(f"User {email}: Preference {category_id} is explicit (score 1.0), no decay/capping.")
        elif category_id not in categories_updated_this_run:
            # Apply decay only if not updated in this run and not explicit 1.0
            current_score *= DECAY_FACTOR
            pref_data["score"] = current_score
            logger.debug(f"User {email}: Preference {category_id} not updated, decayed to {current_score:.4f}.")
        
        # For non-explicit preferences, ensure score is capped after update or decay
        if not is_explicit:
            pref_data["score"] = min(MAX_INFERRED_SCORE, pref_data["score"])

        # Add to final list if score is above threshold OR it's an explicit 1.0 preference
        if pref_data["score"] >= MIN_SCORE_THRESHOLD or is_explicit:
            # Ensure attributes are cleaned up if they become empty dicts (optional)
            if isinstance(pref_data.get("attributes"), dict) and not pref_data["attributes"]:
                pref_data["attributes"] = None # Or remove key: del pref_data["attributes"]

            final_preference_list_for_db.append({
                "category": pref_data["category"],
                "score": round(pref_data["score"], 4), # Round score for storage
                "attributes": pref_data.get("attributes") # Use .get for safety
            })
        else:
            logger.info(f"User {email}: Preference {category_id} with score {pref_data['score']:.4f} removed (below threshold {MIN_SCORE_THRESHOLD}).")
            # No need to explicitly remove from preference_dict as we build a new list
    
    try:
        normalized_preferences = await normalize_categories(final_preference_list_for_db, taxonomy)
    except Exception as norm_error:
        logger.error(f"Error normalizing categories for {email}: {norm_error}", exc_info=True)
        normalized_preferences = final_preference_list_for_db # Use unnormalized as fallback

    update_time = datetime.now()
    await db.users.update_one(
        {"_id": user["_id"]},
        {
            "$set": {
                "preferences": normalized_preferences,
                "updatedAt": update_time,
                "demographicData.lastPreferenceUpdate": update_time # Track when prefs influenced demographics
            }
        }
    )
    logger.info(f"Successfully updated preferences for user {email} in DB. Count: {len(normalized_preferences)}")

    try:
        match_criteria_processed = {"email": email, "processedStatus": "pending"}
        if submission_id and ObjectId.is_valid(submission_id): # Prioritize specific submission ID
             match_criteria_processed["_id"] = ObjectId(submission_id)
        
        result = await db.userData.update_one(
            match_criteria_processed,
            {"$set": {"processedStatus": "processed"}}
        )
        if result.modified_count > 0:
            logger.info(f"Marked userData as processed for {email} (Submission: {submission_id or 'Oldest Pending'}). Modified: {result.modified_count}")
        else:
            logger.warning(f"No pending userData found to mark as processed for {email} with criteria: {match_criteria_processed}")
    except Exception as e:
        logger.error(f"Failed to update userData status for {email}: {str(e)}")

    inference_updated_user = False
    if allow_inference_setting:
        try:
            logger.info(f"Running demographic inference for user {email} ({user_id})")
            # Pass the fetched user document and taxonomy_service instance
            inference_updated_user = await run_inference_for_user(user, taxonomy, db)
            if inference_updated_user:
                logger.info(f"Demographic inference updated user document for {email}.")
        except Exception as inference_error:
            logger.error(f"Demographic inference failed for user {email}: {inference_error}", exc_info=True)
    else:
        logger.info(f"Skipping demographic inference for user {email} ({user_id}) as allowInference is False.")

    auth0_id = user.get("auth0Id")
    if auth0_id:
        logger.info(f"Running post-processing cache invalidation for user {auth0_id}.")
        await invalidate_cache(f"{CACHE_KEYS['USER_DATA']}{auth0_id}")
        await invalidate_cache(f"{CACHE_KEYS['PREFERENCES']}{auth0_id}")
        logger.info(f"Invalidated USER_DATA and PREFERENCES caches for user {auth0_id} (post-processing)")
        if user.get("privacySettings", {}).get("optInStores"):
            for store_id in user["privacySettings"]["optInStores"]:
                await invalidate_cache(f"{CACHE_KEYS['STORE_PREFERENCES']}{user_id}:{store_id}")
            logger.info(f"Invalidated STORE_PREFERENCES for user {auth0_id} for {len(user['privacySettings']['optInStores'])} stores.")
    else:
        logger.warning(f"Cannot invalidate caches for user {email} as auth0Id is missing.")

    return UserPreferences(
        user_id=user_id,
        preferences=[
            UserPreference(
                category=item["category"],
                score=item["score"],
                attributes=item.get("attributes")
            ) for item in normalized_preferences
        ],
        updated_at=update_time
    )