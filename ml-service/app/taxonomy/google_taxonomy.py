import csv
import requests
from pathlib import Path
import numpy as np
from functools import lru_cache
from app.ai.models.embedding_model import get_embedding_model, get_text_embedding

# Constants
TAXONOMY_URL = "https://www.google.com/basepages/producttype/taxonomy.en-US.txt"
TAXONOMY_FILE = Path(__file__).parent / "data" / "google_taxonomy.txt"
EMBEDDINGS_FILE = Path(__file__).parent / "data" / "category_embeddings.npz"

@lru_cache(maxsize=1)
def load_taxonomy():
    """Load the Google Product Taxonomy"""
    # Download if not exists
    if not TAXONOMY_FILE.exists():
        download_taxonomy()

    # Parse taxonomy
    taxonomy = {"categories": {}, "tree": {}, "paths": {}}

    with open(TAXONOMY_FILE, 'r', encoding='utf-8') as file:
        lines = file.readlines()

        # Skip header
        for line in lines[1:]:
            line = line.strip()
            if not line:
                continue

            # Build path and category ID (use hash of full path as ID)
            path = line.split(' > ')
            category_id = str(abs(hash(line)) % (10 ** 10))

            # Store full path
            taxonomy["paths"][category_id] = path

            # Build tree structure
            current = taxonomy["tree"]
            for i, level in enumerate(path):
                if level not in current:
                    current[level] = {"id": category_id} if i == len(path) - 1 else {}
                current = current[level]
                if i == len(path) - 1:
                    current["id"] = category_id

            # Store category
            taxonomy["categories"][category_id] = {
                "name": path[-1],
                "full_path": path,
                "path_string": line
            }

    return taxonomy

def download_taxonomy():
    """Download the latest Google Product Taxonomy"""
    try:
        TAXONOMY_FILE.parent.mkdir(parents=True, exist_ok=True)
        response = requests.get(TAXONOMY_URL)
        response.raise_for_status()
        
        with open(TAXONOMY_FILE, 'w', encoding='utf-8') as file:
            file.write(response.text)
            
    except Exception as e:
        print(f"Failed to download taxonomy: {e}")
        raise

@lru_cache(maxsize=1)
def get_taxonomy_tree():
    """Get the taxonomy tree structure"""
    taxonomy = load_taxonomy()
    return {
        "tree": taxonomy["tree"],
        "version": "google_product_categories_2025"
    }

def normalize_category(category_id):
    """Normalize category ID format"""
    return category_id.strip().lower()

def get_price_range(amount, category_id=None):
    """Simple wrapper for get_price_range_for_amount"""
    price_ranges = get_price_ranges()["defaultPriceRanges"]
    for range_name, range_values in price_ranges.items():
        if range_values["min"] <= amount < range_values["max"]:
            return range_name
    return None

def detect_category_type(path):
    """Detect category type based on path"""
    category_types = set()
    for level in path:
        if "clothing" in level.lower():
            category_types.add("clothing")
        if "electronics" in level.lower():
            category_types.add("electronics")
        if "home" in level.lower():
            category_types.add("home")
        if "beauty" in level.lower():
            category_types.add("beauty")
    return category_types

@lru_cache(maxsize=1000)
def get_category_attributes(category_id):
    """Get attributes for a specific category"""
    taxonomy = load_taxonomy()
    
    # If category doesn't exist, return None
    if category_id not in taxonomy["categories"]:
        return None
    
    # Get category path
    path = taxonomy["categories"][category_id]["full_path"]
    
    # Get attributes for this category (simplified example)
    # In real implementation, attributes would be specific to the Google taxonomy
    attributes = {
        "price_range": ["budget", "mid_range", "premium", "luxury"],
        "color": ["black", "white", "blue", "red", "green", "yellow", "other"],
        "condition": ["new", "like_new", "used", "refurbished"]
    }
    
    # Add specific attributes based on detected category types
    category_types = detect_category_type(path)
    
    if "clothing" in category_types:
        attributes["size"] = ["xs", "s", "m", "l", "xl", "xxl"]
        attributes["material"] = ["cotton", "wool", "polyester", "leather"]
        
    if "electronics" in category_types:
        attributes["brand"] = ["apple", "samsung", "sony", "google", "other"]
        attributes["warranty"] = ["1yr", "2yr", "3yr", "none"]
        
    if "home" in category_types:
        attributes["room"] = ["living", "bedroom", "kitchen", "bathroom", "office"]
        attributes["style"] = ["modern", "traditional", "rustic", "industrial"]
        
    if "beauty" in category_types:
        attributes["skin_type"] = ["oily", "dry", "combination", "sensitive"]
        attributes["concern"] = ["anti-aging", "acne", "brightening", "hydration"]
        
    return attributes

def validate_category(category_id, attributes):
    """Validate product attributes for a category"""
    # Get defined attributes for this category
    valid_attributes = get_category_attributes(category_id)
    
    if not valid_attributes:
        return {"valid": False, "message": f"Unknown category: {category_id}"}
    
    # Validate each attribute
    for attr_name, attr_value in attributes.items():
        # Skip if attribute isn't defined or isn't array type
        if attr_name not in valid_attributes or not isinstance(valid_attributes[attr_name], list):
            continue
            
        # Check if value is allowed
        if attr_value not in valid_attributes[attr_name]:
            return {
                "valid": False,
                "message": f"Invalid {attr_name}: {attr_value}. Must be one of: {', '.join(map(str, valid_attributes[attr_name]))}"
            }
            
    return {"valid": True}

def build_category_embeddings():
    """Build embeddings for all categories"""
    taxonomy = load_taxonomy()
    model = get_embedding_model()  # Use shared model
    
    if model is None:
        return {}
        
    embeddings = {}
    for category_id, info in taxonomy["categories"].items():
        # Generate embedding from full path
        text = " ".join(info["full_path"])
        embedding = get_text_embedding(text)  # Use cached function with error handling
        if embedding is not None:
            embeddings[category_id] = embedding.tolist()
    
    # Save embeddings
    EMBEDDINGS_FILE.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(EMBEDDINGS_FILE, **embeddings)
    
    return embeddings

@lru_cache(maxsize=1)
def get_category_embeddings():
    """Get or create category embeddings"""
    if not EMBEDDINGS_FILE.exists():
        return build_category_embeddings()
        
    # Load existing embeddings
    data = np.load(EMBEDDINGS_FILE)
    return {key: data[key].tolist() for key in data.files}

def find_category_by_text(text, top_k=5):
    """Find closest categories to the given text"""
    taxonomy = load_taxonomy()
    embeddings = get_category_embeddings()
    
    # Get embedding for query text
    query_embedding = get_text_embedding(text)
    if query_embedding is None:
        return []
        
    # Calculate cosine similarity
    similarities = {}
    for category_id, embedding in embeddings.items():
        similarity = np.dot(query_embedding, np.array(embedding)) / (
            np.linalg.norm(query_embedding) * np.linalg.norm(embedding))
        similarities[category_id] = float(similarity)
    
    # Get top matches
    top_matches = sorted(similarities.items(), key=lambda x: x[1], reverse=True)[:top_k]
    
    results = []
    for category_id, score in top_matches:
        category = taxonomy["categories"][category_id]
        results.append({
            "id": category_id,
            "name": category["name"],
            "path": category["path_string"],
            "score": score
        })
        
    return results

@lru_cache(maxsize=1)
def get_price_ranges():
    """Get default price ranges for categories"""
    # In a complete implementation, this could load from a configuration file
    # with category-specific ranges
    return {
        "defaultPriceRanges": {
            "budget": {"min": 0, "max": 50},
            "mid_range": {"min": 50, "max": 200},
            "premium": {"min": 200, "max": 500},
            "luxury": {"min": 500, "max": float('inf')}
        }
    }