from functools import lru_cache
from app.taxonomy.constants import MAIN_CATEGORIES, SUBCATEGORIES
import logging

logger = logging.getLogger(__name__)

@lru_cache(maxsize=1)
def get_category_descriptions():
    """Generate human-readable descriptions for categories in taxonomy"""
    descriptions = {}
    
    # Main categories
    for name, cat_id in MAIN_CATEGORIES.items():
        cleaned_name = name.lower().replace('_', ' ')
        descriptions[str(cat_id)] = cleaned_name
        
    # Subcategories
    for name, cat_id in SUBCATEGORIES.items():
        cleaned_name = name.lower().replace('_', ' ')
        descriptions[str(cat_id)] = cleaned_name
        
    return descriptions

@lru_cache(maxsize=1)
def get_category_embedding_candidates():
    """Generate category descriptions for embedding matching"""
    candidates = []
    descriptions = get_category_descriptions()
    
    for cat_id, description in descriptions.items():
        # Add direct description
        candidates.append((description, cat_id))
        
        # Add variations for subcategories based on common terms
        if cat_id == str(SUBCATEGORIES.get("SMARTPHONES")):
            candidates.extend([
                ("smartphone", cat_id),
                ("mobile phone", cat_id),
                ("cell phone", cat_id),
                ("iphone android phone", cat_id)
            ])
        elif cat_id == str(SUBCATEGORIES.get("COMPUTERS")):
            candidates.extend([
                ("laptop computer", cat_id),
                ("desktop pc", cat_id),
                ("macbook windows computer", cat_id)
            ])
        # Add more variations as needed
    
    return candidates

def build_keyword_category_mapping():
    """Build mapping of keywords to categories based on taxonomy"""
    mapping = {}
    
    # Map common keywords to categories - ideally this would be data-driven
    category_keywords = {
        # Electronics subcategories
        "SMARTPHONES": ["phone", "smartphone", "mobile", "iphone", "android", "cell"],
        "COMPUTERS": ["laptop", "computer", "desktop", "pc", "mac", "chromebook"],
        "AUDIO": ["headphone", "speaker", "earbud", "airpod", "audio", "sound"],
        "TVS_DISPLAYS": ["tv", "television", "monitor", "screen", "display"],
        "CAMERAS": ["camera", "dslr", "mirrorless", "webcam", "gopro"],
        
        # Clothing subcategories
        "MENS_CLOTHING": ["men", "mens", "man", "male", "guys"],
        "WOMENS_CLOTHING": ["women", "womens", "woman", "female", "ladies"],
        "SHOES": ["shoe", "sneaker", "boot", "footwear", "sandal"],
        
        # Add more categories as needed
    }
    
    # Build the mapping
    for category_name, keywords in category_keywords.items():
        cat_id = SUBCATEGORIES.get(category_name)
        if cat_id:
            for keyword in keywords:
                mapping[keyword] = str(cat_id)
    
    return mapping