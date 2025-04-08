"""
Tapiro Product Taxonomy Package
This package provides utilities for working with the product taxonomy
"""
# Fix the circular import by removing specific imports and implementing normalize_category here

def normalize_category(category_id):
    """Normalize category ID format"""
    if not category_id:
        return None
    return str(category_id).strip()

def get_price_range(amount, category_id=None):
    """Simple wrapper for get_price_range_for_amount"""
    # Import inside function to avoid circular imports
    from .google_taxonomy import get_price_ranges
    
    price_ranges = get_price_ranges()
    default_ranges = price_ranges["defaultPriceRanges"]
    
    # Find matching range
    for range_name, range_values in default_ranges.items():
        if amount >= range_values["min"] and (range_values["max"] == float('inf') or amount < range_values["max"]):
            return range_name
    
    return "unknown"

# Import after defining the above functions to avoid circular imports
from .google_taxonomy import (
    get_taxonomy_tree,
    get_category_attributes,
    validate_category,
    get_category_embeddings,
    find_category_by_text,
    load_taxonomy,
    get_price_ranges
)

# Avoid circular imports by not importing embedding models here
__all__ = [
    'normalize_category',
    'get_price_range',
    'get_taxonomy_tree',
    'get_category_attributes',
    'validate_category',
    'get_category_embeddings',
    'find_category_by_text',
    'load_taxonomy',
    'get_price_ranges'
]