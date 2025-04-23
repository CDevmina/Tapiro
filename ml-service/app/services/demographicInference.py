import logging
from collections import defaultdict
from typing import List, Dict, Any, Optional, Tuple
from bson import ObjectId
from datetime import datetime # Import datetime
from app.utils.redis_util import invalidate_cache, CACHE_KEYS # Import cache utilities

logger = logging.getLogger(__name__)

# --- Keyword Definitions (Examples - Expand significantly) ---
KIDS_KEYWORDS = {
    "baby", "toddler", "child", "kid", "infant", "diaper", "stroller",
    "crib", "formula", "nursery", "maternity", "school supplies", "toy",
    "lego", "barbie", "playstation", "nintendo", # Be careful with broad terms
}
RELATIONSHIP_KEYWORDS = {
    "wedding", "engagement", "anniversary", "couple", "partner", "spouse",
    "boyfriend", "girlfriend", "husband", "wife", "romantic", "valentine",
}
MARRIED_KEYWORDS = {
    "wedding", "anniversary", "spouse", "husband", "wife", "married",
}
SINGLE_KEYWORDS = {
    "single", "dating app", "matchmaking",
}

# --- NEW Keyword Sets ---
EMPLOYMENT_KEYWORDS = {
    "job search", "linkedin", "resume", "interview suit", "office supplies",
    "business travel", "conference", "work laptop", "unemployment benefits",
    "career fair", "networking event",
}
STUDENT_KEYWORDS = {
    "student discount", "university", "college", "textbook", "dorm room",
    "student loan", "internship", "campus", "study guide", "backpack",
    "school supplies", # Overlap with KIDS_KEYWORDS, context matters
}
EDUCATION_KEYWORDS = {
    "university", "college", "bachelor's degree", "master's degree", "phd",
    "doctorate", "thesis", "dissertation", "academic journal", "textbook",
    "research paper", "graduate school",
}
# Age bracket keywords are very unreliable, use with extreme caution or alternative methods
AGE_BRACKET_YOUNG_ADULT_KEYWORDS = { # Approx 18-24
    "college", "university", "first apartment", "internship", "study abroad",
    "spring break", "starter job",
}
AGE_BRACKET_MID_CAREER_KEYWORDS = { # Approx 35-54
    "mortgage", "kids' college fund", "management training", "midlife crisis", # Joking, but maybe?
    "retirement planning", "executive",
}
AGE_BRACKET_SENIOR_KEYWORDS = { # Approx 65+
    "retirement", "pension", "senior discount", "medicare", "grandchild",
    "assisted living", "downsizing home",
}
# --- End NEW Keyword Sets ---


# --- Helper Function to Extract Text ---
def _extract_text_from_entries(entries: List[Dict[str, Any]]) -> List[str]:
    """Extracts relevant text (item names, search queries) from entries."""
    texts = []
    for entry in entries:
        if entry.get("dataType") == "purchase":
            texts.extend([item.get("name", "").lower() for item in entry.get("items", [])])
        elif entry.get("dataType") == "search":
            texts.append(entry.get("query", "").lower())
    return [text for text in texts if text] # Filter out empty strings

# --- Inference Functions ---

async def infer_has_kids(entries: List[Dict[str, Any]]) -> Optional[bool]:
    """Infer if user has kids based on purchase/search keywords."""
    kid_evidence_count = 0
    texts = _extract_text_from_entries(entries)
    logger.debug(f"Inferring 'has_kids' from {len(texts)} text entries.")
    for text in texts:
        if any(keyword in text for keyword in KIDS_KEYWORDS):
            kid_evidence_count += 1
            logger.debug(f"Kid keyword found: {text}")

    if kid_evidence_count >= 2: # Require multiple pieces of evidence
        logger.debug(f"Inferring 'has_kids' = True (evidence count: {kid_evidence_count})")
        return True
    logger.debug(f"Inferring 'has_kids' = None (evidence count: {kid_evidence_count})")
    return None # Not enough evidence

async def infer_relationship_status(entries: List[Dict[str, Any]]) -> Optional[str]:
    """Infer relationship status (single, relationship, married) based on keywords."""
    married_evidence = 0
    relationship_evidence = 0
    single_evidence = 0 # Less reliable
    texts = _extract_text_from_entries(entries)
    logger.debug(f"Inferring 'relationship_status' from {len(texts)} text entries.")

    for text in texts:
        # Check married first for priority
        if any(keyword in text for keyword in MARRIED_KEYWORDS):
            married_evidence += 1
            logger.debug(f"Married keyword found: {text}")
        elif any(keyword in text for keyword in RELATIONSHIP_KEYWORDS):
            relationship_evidence += 1
            logger.debug(f"Relationship keyword found: {text}")
        elif any(keyword in text for keyword in SINGLE_KEYWORDS):
             single_evidence += 1
             logger.debug(f"Single keyword found: {text}")

    # Prioritize married > relationship > single based on evidence threshold
    if married_evidence >= 1: # Lower threshold for specific events like wedding
        logger.debug(f"Inferring 'relationship_status' = 'married' (evidence count: {married_evidence})")
        return "married"
    elif relationship_evidence >= 2:
        logger.debug(f"Inferring 'relationship_status' = 'relationship' (evidence count: {relationship_evidence})")
        return "relationship"
    # elif single_evidence >= 1: # Be very cautious enabling this
    #    logger.debug(f"Inferring 'relationship_status' = 'single' (evidence count: {single_evidence})")
    #    return "single"
    logger.debug("Inferring 'relationship_status' = None (insufficient evidence)")
    return None # Not enough evidence

# --- NEW Inference Functions ---

async def infer_employment_status(entries: List[Dict[str, Any]]) -> Optional[str]:
    """Infer employment status (employed, student, unemployed) based on keywords."""
    student_evidence = 0
    employment_evidence = 0
    # Inferring 'unemployed' directly from keywords is very difficult/unreliable
    texts = _extract_text_from_entries(entries)
    logger.debug(f"Inferring 'employment_status' from {len(texts)} text entries.")

    for text in texts:
        # Check student first due to potential overlap (e.g., "school supplies")
        if any(keyword in text for keyword in STUDENT_KEYWORDS):
            student_evidence += 1
            logger.debug(f"Student keyword found: {text}")
        elif any(keyword in text for keyword in EMPLOYMENT_KEYWORDS):
            employment_evidence += 1
            logger.debug(f"Employment keyword found: {text}")

    # Prioritize student if strong evidence, otherwise employed
    if student_evidence >= 2:
        logger.debug(f"Inferring 'employment_status' = 'student' (evidence count: {student_evidence})")
        return "student"
    elif employment_evidence >= 2:
        logger.debug(f"Inferring 'employment_status' = 'employed' (evidence count: {employment_evidence})")
        return "employed"
    # Add more sophisticated logic? Check for conflicting terms?
    logger.debug("Inferring 'employment_status' = None (insufficient evidence)")
    return None # Not enough evidence

async def infer_education_level(entries: List[Dict[str, Any]]) -> Optional[str]:
    """Infer education level (high_school, bachelors, masters, doctorate) - Very Speculative."""
    doctorate_evidence = 0
    masters_evidence = 0
    bachelors_evidence = 0
    texts = _extract_text_from_entries(entries)
    logger.debug(f"Inferring 'education_level' from {len(texts)} text entries.")

    for text in texts:
        # Check most specific first
        if any(keyword in text for keyword in ["phd", "doctorate", "dissertation"]):
            doctorate_evidence += 1
            logger.debug(f"Doctorate keyword found: {text}")
        elif any(keyword in text for keyword in ["master's degree", "graduate school", "thesis"]):
            masters_evidence += 1
            logger.debug(f"Masters keyword found: {text}")
        elif any(keyword in text for keyword in ["bachelor's degree", "university", "college", "undergrad"]):
            bachelors_evidence += 1
            logger.debug(f"Bachelors keyword found: {text}")

    # Prioritize highest level found with some evidence threshold
    if doctorate_evidence >= 1:
        logger.debug(f"Inferring 'education_level' = 'doctorate' (evidence count: {doctorate_evidence})")
        return "doctorate"
    elif masters_evidence >= 1:
        logger.debug(f"Inferring 'education_level' = 'masters' (evidence count: {masters_evidence})")
        return "masters"
    elif bachelors_evidence >= 2: # Require slightly more for bachelors
        logger.debug(f"Inferring 'education_level' = 'bachelors' (evidence count: {bachelors_evidence})")
        return "bachelors"
    # Inferring 'high_school' is difficult, maybe default if other evidence is weak?
    logger.debug("Inferring 'education_level' = None (insufficient evidence)")
    return None # Very uncertain

async def infer_age_bracket(entries: List[Dict[str, Any]]) -> Optional[str]:
    """Infer age bracket based on keywords - EXTREMELY SPECULATIVE AND UNRELIABLE."""
    young_adult_evidence = 0
    mid_career_evidence = 0
    senior_evidence = 0
    texts = _extract_text_from_entries(entries)
    logger.debug(f"Inferring 'age_bracket' from {len(texts)} text entries.")

    for text in texts:
        if any(keyword in text for keyword in AGE_BRACKET_SENIOR_KEYWORDS):
            senior_evidence += 1
            logger.debug(f"Senior age keyword found: {text}")
        elif any(keyword in text for keyword in AGE_BRACKET_MID_CAREER_KEYWORDS):
            mid_career_evidence += 1
            logger.debug(f"Mid-career age keyword found: {text}")
        elif any(keyword in text for keyword in AGE_BRACKET_YOUNG_ADULT_KEYWORDS):
            young_adult_evidence += 1
            logger.debug(f"Young adult age keyword found: {text}")

    # Simple thresholding - needs much refinement or a different approach
    if senior_evidence >= 1:
        logger.debug(f"Inferring 'age_bracket' = '65+' (evidence count: {senior_evidence})")
        return "65+"
    elif mid_career_evidence >= 2:
        # Could try to differentiate 35-44 vs 45-54 based on keywords, but very hard
        logger.debug(f"Inferring 'age_bracket' = '35-54' (evidence count: {mid_career_evidence})")
        return "35-54" # Combine for now
    elif young_adult_evidence >= 2:
        logger.debug(f"Inferring 'age_bracket' = '18-24' (evidence count: {young_adult_evidence})")
        return "18-24"

    logger.warning("Age bracket inference based on keywords is highly unreliable.")
    logger.debug("Inferring 'age_bracket' = None (insufficient evidence)")
    return None # Highly uncertain

# --- Main Inference Runner ---

async def run_inference_for_user(user_id: str, email: str, db, limit: int = 50) -> bool:
    """
    Runs demographic inference based on recent user data and updates the user document if changes are found.
    Returns True if the user document was updated, False otherwise.
    """
    logger.info(f"Running demographic inference for user {user_id} ({email})")
    updated = False
    try:
        user_object_id = ObjectId(user_id)
        user = await db.users.find_one({"_id": user_object_id})
        if not user:
            logger.error(f"Inference: User not found by ID {user_id}")
            return False

        # Fetch recent userData entries for the user
        recent_data = await db.userData.find(
            {"userId": user_object_id}
        ).sort("timestamp", -1).limit(limit).to_list(length=limit)

        if not recent_data:
            logger.info(f"Inference: No recent data found for user {user_id}")
            return False
        else:
            logger.info(f"Inference: Found {len(recent_data)} recent data entries for user {user_id}")


        # --- Run inference functions ---
        inferred_kids = await infer_has_kids(recent_data)
        inferred_status = await infer_relationship_status(recent_data)
        inferred_employment = await infer_employment_status(recent_data)
        inferred_education = await infer_education_level(recent_data) # Very speculative
        inferred_age_bracket = None
        # Only infer age bracket if age is not already set in demographicData
        current_demographics = user.get("demographicData", {})
        if current_demographics.get("age") is None:
            logger.info(f"Inference: User {email} has no age set, attempting age bracket inference.")
            inferred_age_bracket = await infer_age_bracket(recent_data) # Highly speculative
        else:
            logger.info(f"Inference: User {email} has age set ({current_demographics.get('age')}), skipping age bracket inference.")


        # --- Prepare update payload ---
        update_payload = {}
        # Read current values from the nested demographicData object
        current_kids = current_demographics.get("inferredHasKids")
        current_status = current_demographics.get("inferredRelationshipStatus")
        current_employment = current_demographics.get("inferredEmploymentStatus")
        current_education = current_demographics.get("inferredEducationLevel")
        current_age_bracket = current_demographics.get("inferredAgeBracket")

        # Use dot notation for updates within the nested object
        if inferred_kids is not None and inferred_kids != current_kids:
            update_payload["demographicData.inferredHasKids"] = inferred_kids
            logger.info(f"Inference update for {email}: demographicData.inferredHasKids -> {inferred_kids} (was {current_kids})")
        if inferred_status is not None and inferred_status != current_status:
            update_payload["demographicData.inferredRelationshipStatus"] = inferred_status
            logger.info(f"Inference update for {email}: demographicData.inferredRelationshipStatus -> {inferred_status} (was {current_status})")
        if inferred_employment is not None and inferred_employment != current_employment:
            update_payload["demographicData.inferredEmploymentStatus"] = inferred_employment
            logger.info(f"Inference update for {email}: demographicData.inferredEmploymentStatus -> {inferred_employment} (was {current_employment})")
        if inferred_education is not None and inferred_education != current_education:
            update_payload["demographicData.inferredEducationLevel"] = inferred_education
            logger.info(f"Inference update for {email}: demographicData.inferredEducationLevel -> {inferred_education} (was {current_education})")
        if inferred_age_bracket is not None and inferred_age_bracket != current_age_bracket:
            update_payload["demographicData.inferredAgeBracket"] = inferred_age_bracket
            logger.info(f"Inference update for {email}: demographicData.inferredAgeBracket -> {inferred_age_bracket} (was {current_age_bracket})")
        # --- End Prepare update payload ---

        # Update user document in DB if there are changes
        if update_payload:
            logger.info(f"Inference: Found updates for {email}: {update_payload.keys()}")
            update_payload["updatedAt"] = datetime.now() # Update timestamp
            result = await db.users.update_one(
                {"_id": user_object_id},
                {"$set": update_payload}
            )
            if result.modified_count > 0:
                updated = True
                logger.info(f"Inference: Successfully updated user document for {email}")

                # --- Invalidate Caches on Successful Update ---
                auth0_id = user.get("auth0Id")
                if auth0_id:
                    # Invalidate user data and general preferences
                    await invalidate_cache(f"{CACHE_KEYS['USER_DATA']}{auth0_id}")
                    await invalidate_cache(f"{CACHE_KEYS['PREFERENCES']}{auth0_id}")
                    logger.info(f"Inference: Invalidated USER_DATA and PREFERENCES cache for {auth0_id}")

                    # Invalidate store-specific preferences for opt-in stores
                    if user.get("privacySettings", {}).get("optInStores"):
                        user_object_id_str = str(user_object_id)
                        for store_id in user["privacySettings"]["optInStores"]:
                            await invalidate_cache(f"{CACHE_KEYS['STORE_PREFERENCES']}{user_object_id_str}:{store_id}")
                        logger.info(f"Inference: Invalidated STORE_PREFERENCES caches for {auth0_id}")
                # --- End Cache Invalidation ---
            else:
                 logger.warning(f"Inference: Update payload generated but DB modify count was 0 for {email}. Payload: {update_payload}")
        else:
            logger.info(f"Inference: No demographic updates found for {email}")


    except Exception as e:
        logger.error(f"Error during demographic inference for user {user_id}: {str(e)}", exc_info=True)

    return updated
