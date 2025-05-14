import logging
from collections import defaultdict
from typing import List, Dict, Any, Optional, Tuple
from bson import ObjectId
from datetime import datetime
from app.utils.redis_util import invalidate_cache, CACHE_KEYS
from sentence_transformers import util
import numpy as np
from app.services.taxonomyService import TaxonomyService

logger = logging.getLogger(__name__)

# --- Semantic Configuration ---
SEMANTIC_SIMILARITY_THRESHOLD = 0.60
EVIDENCE_THRESHOLD_DEFAULT = 2.0 # Use float for weighted evidence
EVIDENCE_THRESHOLD_MARRIED = 1.5 # Lower threshold for strong marriage signals
EVIDENCE_THRESHOLD_EDUCATION = 1.5 # Lower threshold for specific education terms

# --- NEW: Rule-Based Keyword Configuration ---
# Keywords should be lowercase
KEYWORD_RULES = {
    "has_kids": {
        True: {"baby", "infant", "maternity", "diaper", "stroller", "crib", "newborn", "toddler", "child's toy"}
    },
    "relationship_status": {
        "married": {"wedding", "anniversary", "spouse", "husband", "wife"},
        "relationship": {"boyfriend", "girlfriend", "dating", "partner gift", "couples"}
    },
    "employment_status": {
        "student": {"student loan", "internship", "university", "college", "textbook", "dorm"},
        "unemployed": {"resume help", "job search"}
    },
    "education_level": {
        "doctorate": {"phd", "dissertation", "postdoc"},
        "masters": {"master's degree", "thesis"},
        "bachelors": {"bachelor's degree", "undergrad"},
    },
    "gender": { # Use with extreme caution
        "male": {"men's", "for him", "grooming kit men"},
        "female": {"women's", "for her", "makeup set", "feminine hygiene"}
    }
}

# --- NEW: Evidence Weights ---
RULE_MATCH_WEIGHT = 1.5
SEMANTIC_MATCH_WEIGHT = 1.0

# --- Semantic Target Descriptions ---
SEMANTIC_TARGETS = {
    "has_kids": {
        True: [
            "items for babies or infants",
            "children's toys and games",
            "parenting supplies",
            "school-related items for kids",
            "maternity wear or products",
            "family activities or vacations",
        ],
    },
    "relationship_status": {
        "married": [
            "wedding gifts or planning items",
            "anniversary presents",
            "items for spouse or partner",
            "joint home purchases",
            "husband or wife related items",
        ],
        "relationship": [
            "gifts for partner or significant other",
            "couples items or activities",
            "romantic presents",
            "dating related items",
            "items for boyfriend or girlfriend",
        ],
        "single": [
            "items for one person",
            "dating app subscriptions",
            "solo travel or activities",
            "self-care items focused on independence",
        ]
    },
    "employment_status": {
        "employed": [
            "professional work attire",
            "office supplies or equipment",
            "business travel items",
            "commute-related products",
            "career development materials",
        ],
        "student": [
            "textbooks or course materials",
            "university or college supplies",
            "dorm room furnishings",
            "student discounts or events",
            "internship-related items",
            "study aids",
        ],
        "unemployed": [
            "job searching resources",
            "resume building services",
        ]
    },
    "education_level": {
        "doctorate": [
            "phd program materials",
            "dissertation research tools",
            "academic conference registration",
            "postdoctoral research supplies",
        ],
        "masters": [
            "master's degree program materials",
            "graduate school textbooks",
            "thesis writing resources",
        ],
        "bachelors": [
            "bachelor's degree program materials",
            "undergraduate textbooks",
            "college supplies",
            "university merchandise",
        ],
        "high_school": [
            "high school supplies",
        ]
    },
    "gender": { # Also potentially unreliable/sensitive
         "male": [
             "men's clothing and accessories",
             "grooming products typically for men",
             "hobbies stereotypically associated with men",
             "gifts for him",
         ],
         "female": [
             "women's clothing and accessories",
             "makeup and cosmetics",
             "skincare products typically for women",
             "hobbies stereotypically associated with women",
             "gifts for her",
             "feminine hygiene products",
         ],
         "non-binary": [
             "gender-neutral clothing",
             "unisex products",
         ]
    }
}
# --- End Semantic Target Descriptions ---


# --- Helper Function to Extract Text (Keep as is) ---
def _extract_text_from_user_data_docs(user_data_docs: List[Dict[str, Any]]) -> List[str]:
    texts = []
    for doc in user_data_docs: # Each doc is a userData document from DB
        doc_data_type = doc.get("dataType") # dataType is at doc level
        for entry in doc.get("entries", []): # entries is a list within the doc
            if doc_data_type == "purchase":
                for item in entry.get("items", []): # entry here is a purchase entry
                    if item.get("name"):
                        texts.append(item["name"])
            elif doc_data_type == "search":
                if entry.get("query"): # entry here is a search entry
                    texts.append(entry["query"])
    return [text for text in texts if text and isinstance(text, str) and len(text.strip()) > 0] # Filter out empty/invalid strings



# --- Hybrid Inference Helper (Modified) ---
async def _run_hybrid_inference_for_attribute(
    attribute_name: str,
    user_data_docs: List[Dict[str, Any]],
    taxonomy_service # Pass the service instance
) -> Optional[Any]:
    texts = _extract_text_from_user_data_docs(user_data_docs)
    if not texts:
        logger.debug(f"Hybrid Inference ({attribute_name}): No text entries found.")
        return None

    logger.debug(f"Hybrid Inference ({attribute_name}): Processing {len(texts)} text entries.")

    semantic_target_map = SEMANTIC_TARGETS.get(attribute_name, {})
    target_embeddings_tensor = None
    semantic_target_value_map = {} # Maps index in target_embeddings_tensor to actual value
    all_semantic_target_texts_for_encoding = []
    can_do_semantic = False

    if semantic_target_map and taxonomy_service and taxonomy_service.embedding_model:
        idx_counter = 0
        for actual_value, descriptions_list in semantic_target_map.items():
            for desc_text in descriptions_list:
                all_semantic_target_texts_for_encoding.append(desc_text)
                semantic_target_value_map[idx_counter] = actual_value
                idx_counter += 1
        
        if all_semantic_target_texts_for_encoding:
            target_embeddings_tensor = taxonomy_service.embedding_model.encode(
                all_semantic_target_texts_for_encoding,
                convert_to_tensor=True,
                show_progress_bar=False 
            )
            can_do_semantic = True
            logger.debug(f"Hybrid Inference ({attribute_name}): Encoded {len(all_semantic_target_texts_for_encoding)} semantic target descriptions.")
        else:
             logger.debug(f"Hybrid Inference ({attribute_name}): No semantic target descriptions to encode.")
    else:
        logger.warning(f"Hybrid Inference ({attribute_name}): Semantic inference disabled (no targets or model unavailable).")

    keyword_rule_map = KEYWORD_RULES.get(attribute_name, {})
    can_do_rules = bool(keyword_rule_map)
    logger.debug(f"Hybrid Inference ({attribute_name}): Keyword rules {'enabled' if can_do_rules else 'disabled'}.")

    if not can_do_rules and not can_do_semantic:
        logger.warning(f"Hybrid Inference ({attribute_name}): No rules or semantic targets available. Cannot infer.")
        return None

    evidence_counts = defaultdict(float)
    matched_texts_per_value = defaultdict(set)

    all_user_text_embeddings = None
    if can_do_semantic and texts: # Ensure texts is not empty for encoding
        all_user_text_embeddings = taxonomy_service.embedding_model.encode(
            texts, # Encode all user texts in one batch
            convert_to_tensor=True,
            show_progress_bar=False, 
            batch_size=32 
        )
        logger.debug(f"Hybrid Inference ({attribute_name}): Encoded {len(texts)} user texts in a batch.")

    for i, text_content in enumerate(texts):
        original_text_lower = text_content.lower()
        # ... (Rule matching logic remains the same, ensure it uses original_text_lower and text_content)
        if can_do_rules:
            for rule_value, keywords in keyword_rule_map.items():
                if any(keyword in original_text_lower for keyword in keywords):
                    if text_content not in matched_texts_per_value[rule_value]:
                        evidence_counts[rule_value] += RULE_MATCH_WEIGHT
                        matched_texts_per_value[rule_value].add(text_content)
                    logger.debug(f"Hybrid Inference ({attribute_name}): Text '{text_content[:30]}...' matched rule for '{rule_value}'.")
                    # Consider if a `break` is needed if one rule match per text is enough

        if can_do_semantic and all_user_text_embeddings is not None:
            current_text_embedding = all_user_text_embeddings[i]
            similarities = util.pytorch_cos_sim(current_text_embedding, target_embeddings_tensor)[0]

            for target_idx, similarity_score_tensor in enumerate(similarities):
                similarity_score = similarity_score_tensor.item()
                actual_target_value = semantic_target_value_map[target_idx]

                if similarity_score >= SEMANTIC_SIMILARITY_THRESHOLD:
                    if text_content not in matched_texts_per_value[actual_target_value]:
                        evidence_counts[actual_target_value] += SEMANTIC_MATCH_WEIGHT * similarity_score
                        matched_texts_per_value[actual_target_value].add(text_content)
                    logger.debug(f"Hybrid Inference ({attribute_name}): Text '{text_content[:30]}...' semantically matched '{actual_target_value}' (Score: {similarity_score:.2f}).")

    # --- Determine inferred value based on evidence thresholds (logic remains the same) ---
    inferred_value = None
    highest_evidence_score = 0.0

    # Special handling for relationship status priority
    if attribute_name == "relationship_status":
        if evidence_counts.get("married", 0.0) >= EVIDENCE_THRESHOLD_MARRIED:
            inferred_value = "married"
            highest_evidence_score = evidence_counts["married"]
        # Check 'relationship' only if 'married' didn't meet threshold or if its score is higher
        elif evidence_counts.get("relationship", 0.0) >= EVIDENCE_THRESHOLD_DEFAULT and \
             evidence_counts.get("relationship", 0.0) > highest_evidence_score :
            inferred_value = "relationship"
            highest_evidence_score = evidence_counts["relationship"]
    # Special handling for education level priority
    elif attribute_name == "education_level":
        if evidence_counts.get("doctorate", 0.0) >= EVIDENCE_THRESHOLD_EDUCATION:
            inferred_value = "doctorate"
            highest_evidence_score = evidence_counts["doctorate"]
        elif evidence_counts.get("masters", 0.0) >= EVIDENCE_THRESHOLD_EDUCATION and \
             evidence_counts.get("masters", 0.0) > highest_evidence_score:
            inferred_value = "masters"
            highest_evidence_score = evidence_counts["masters"]
        elif evidence_counts.get("bachelors", 0.0) >= EVIDENCE_THRESHOLD_DEFAULT and \
             evidence_counts.get("bachelors", 0.0) > highest_evidence_score:
            inferred_value = "bachelors"
            highest_evidence_score = evidence_counts["bachelors"]
    else:
        # Default handling: pick value with highest evidence score above threshold
        threshold_to_use = EVIDENCE_THRESHOLD_DEFAULT # Default threshold
        # Example: if attribute_name == "has_kids": threshold_to_use = SOME_OTHER_THRESHOLD
        
        for value_candidate, score in evidence_counts.items():
            if score >= threshold_to_use and score > highest_evidence_score:
                highest_evidence_score = score
                inferred_value = value_candidate
            # If scores are equal, you might have a tie-breaking rule or pick the first one
            elif score >= threshold_to_use and score == highest_evidence_score and inferred_value is None:
                 highest_evidence_score = score
                 inferred_value = value_candidate


    if inferred_value is not None:
        logger.info(f"Hybrid Inference Result ({attribute_name}): Inferred '{inferred_value}' (Evidence Score: {highest_evidence_score:.2f})")
    else:
        log_counts = {k: round(v, 2) for k, v in evidence_counts.items()}
        logger.info(f"Hybrid Inference Result ({attribute_name}): None (Insufficient evidence. Scores: {log_counts})")

    return inferred_value

# --- Main Inference Runner (Updated) ---
async def run_inference_for_user(user: Dict[str, Any], taxonomy_service: TaxonomyService, db, limit: int = 50) -> bool:
    """
    Runs HYBRID demographic inference based on recent user data and updates
    the user document if changes are found AND the user has not provided their own value.
    Returns True if the user document was updated, False otherwise.
    """
    user_id = str(user["_id"]) # Get user_id from the passed user object
    email = user["email"]      # Get email from the passed user object
    logger.info(f"Running HYBRID demographic inference for user {user_id} ({email})")
    updated = False
    try:
        user_object_id = user["_id"] # user["_id"] is already an ObjectId

        # User document is now passed as an argument, no need to fetch again.
        # taxonomy_service is now passed as an argument, no need to fetch again via get_taxonomy_service here.

        # Fetch recent userData entries
        recent_data = await db.userData.find(
            {"userId": user_object_id}
        ).sort("timestamp", -1).limit(limit).to_list(length=limit)

        if not recent_data:
            logger.info(f"Inference: No recent data found for user {user_id}")
            return False

        logger.info(f"Inference: Found {len(recent_data)} recent data entries for user {user_id}")

        current_demographics = user.get("demographicData", {})

        # --- Run hybrid inference functions (conditionally) ---
        inferred_kids = None
        if current_demographics.get("hasKids") is None:
            inferred_kids = await _run_hybrid_inference_for_attribute("has_kids", recent_data, taxonomy_service)
        else:
            logger.info(f"Inference (has_kids): Skipped, user value exists ('{current_demographics.get('hasKids')}')")

        inferred_status = None
        if current_demographics.get("relationshipStatus") is None:
            inferred_status = await _run_hybrid_inference_for_attribute("relationship_status", recent_data, taxonomy_service)
        else:
             logger.info(f"Inference (relationship_status): Skipped, user value exists ('{current_demographics.get('relationshipStatus')}')")

        inferred_employment = None
        if current_demographics.get("employmentStatus") is None:
            inferred_employment = await _run_hybrid_inference_for_attribute("employment_status", recent_data, taxonomy_service)
        else:
             logger.info(f"Inference (employment_status): Skipped, user value exists ('{current_demographics.get('employmentStatus')}')")

        inferred_education = None
        if current_demographics.get("educationLevel") is None:
            inferred_education = await _run_hybrid_inference_for_attribute("education_level", recent_data, taxonomy_service)
        else:
             logger.info(f"Inference (education_level): Skipped, user value exists ('{current_demographics.get('educationLevel')}')")

        inferred_gender = None
        if current_demographics.get("gender") is None:
             inferred_gender = await _run_hybrid_inference_for_attribute("gender", recent_data, taxonomy_service)
        else:
             logger.info(f"Inference (gender): Skipped, user value exists ('{current_demographics.get('gender')}')")

        # --- Prepare update payload (Simplified check_and_set) ---
        update_payload = {}
        now = datetime.now()

        # Simplified: Only updates the inferred field if the new inference differs from the current inferred value
        def check_and_set(field_name: str, inferred_value: Any):
            # Note: field_name here is the *inferred* field name (e.g., "inferredHasKids")
            current_inferred_value = current_demographics.get(field_name)

            if inferred_value is not None and inferred_value != current_inferred_value:
                # Use dot notation for nested update
                db_field_name = f"demographicData.{field_name}"
                update_payload[db_field_name] = inferred_value
                logger.info(f"Inference update for {email}: {db_field_name} -> {inferred_value} (was {current_inferred_value})")
            # No need to log skipping based on verification anymore

        # Map inferred values to their DB field names
        check_and_set("inferredHasKids", inferred_kids)
        check_and_set("inferredRelationshipStatus", inferred_status)
        check_and_set("inferredEmploymentStatus", inferred_employment)
        check_and_set("inferredEducationLevel", inferred_education)
        check_and_set("inferredGender", inferred_gender)
        # --- End Prepare update payload ---

        # --- Update user document in DB if there are changes ---
        if update_payload:
            update_payload["updatedAt"] = now # Update timestamp
            result = await db.users.update_one(
                {"_id": user_object_id},
                {"$set": update_payload}
            )
            if result.modified_count > 0:
                updated = True
                logger.info(f"Inference: Successfully updated inferred demographic data for user {user_id}")
                # --- Invalidate Caches ---
                auth0_id = user.get("auth0Id")
                if auth0_id:
                    await invalidate_cache(f"{CACHE_KEYS['USER_DATA']}{auth0_id}")
                    await invalidate_cache(f"{CACHE_KEYS['PREFERENCES']}{auth0_id}") # Invalidate prefs as demographics changed
                    # Invalidate store-specific caches if opt-in stores exist
                    if user.get("privacySettings", {}).get("optInStores"):
                        for store_id in user["privacySettings"]["optInStores"]:
                            # Use user_id (ObjectId string) for store cache key consistency
                            await invalidate_cache(f"{CACHE_KEYS['STORE_PREFERENCES']}{user_id}:{store_id}")
                    logger.info(f"Inference: Invalidated relevant caches for user {auth0_id}")
                # --- End Cache Invalidation ---
            else:
                logger.warning(f"Inference: Update attempted for {user_id} but no documents were modified.")
        else:
            logger.info(f"Inference: No inferred demographic updates needed for {user_id}")

    except Exception as e:
        logger.error(f"Error during demographic inference for user {user_id}: {str(e)}", exc_info=True)
        # Do not return True here, as the update didn't necessarily succeed
        updated = False # Ensure updated is False on error

    return updated
    # --- End Main Inference Runner ---
