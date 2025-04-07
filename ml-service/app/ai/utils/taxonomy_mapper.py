from functools import lru_cache
import logging
from app.taxonomy.google_taxonomy import load_taxonomy

logger = logging.getLogger(__name__)

@lru_cache(maxsize=1)
def get_category_descriptions():
    """Generate human-readable descriptions for categories in taxonomy"""
    descriptions = {}
    taxonomy = load_taxonomy()
    
    # Generate descriptions from Google taxonomy categories
    for category_id, info in taxonomy["categories"].items():
        descriptions[category_id] = info["name"].lower()
        
    return descriptions

@lru_cache(maxsize=1)
def get_category_embedding_candidates():
    """Generate category descriptions for embedding matching"""
    taxonomy = load_taxonomy()
    candidates = []
    
    # Use full paths for better matching
    for category_id, info in taxonomy["categories"].items():
        candidates.append({
            "id": category_id,
            "text": " ".join(info["full_path"]),
            "name": info["name"]
        })
    
    return candidates

def build_keyword_category_mapping():
    """Build mapping of keywords to categories based on taxonomy"""
    taxonomy = load_taxonomy()
    mapping = {}
    
    # Map common keywords to their categories
    # This would be expanded with a more comprehensive mapping
    # based on the Google taxonomy structure
    
    # Example mappings (simplified)
    main_category_keywords = {
        "Electronics": ["electronics", "devices", "gadgets", "tech"],
        "Clothing": ["clothing", "apparel", "wear", "fashion"],
        "Home & Garden": ["home", "garden", "furniture", "decor"],
        "Beauty & Personal Care": ["beauty", "cosmetics", "skincare"],
        # etc.
    }
    
    # Convert full taxonomy paths to keyword mappings
    for category_id, info in taxonomy["categories"].items():
        # Extract keywords from the path
        path_text = " ".join(info["full_path"]).lower()
        words = path_text.split()
        
        # Map significant words
        for word in words:
            if len(word) > 3:  # Skip short words
                mapping[word] = category_id
    
    return mapping