"""
Taxonomy utilities
This module provides helper functions for working with the taxonomy
"""
import re
from .constants import CATEGORY_NAME_MAP, PRICE_RANGES, MAIN_CATEGORIES

def get_main_category_id(category_id):
    """
    Get the main category ID from any category ID
    Args:
        category_id (str|int): Category ID
    Returns:
        int|None: Main category ID or None if invalid
    """
    if isinstance(category_id, str) and category_id.isdigit():
        # If it's a string with numbers, convert to integer
        category_num = int(category_id)
        return (category_num // 100) * 100
    elif isinstance(category_id, int):
        # If it's already a number
        return (category_id // 100) * 100
    return None

def get_main_category_name(category_id):
    """
    Get main category name from ID
    Args:
        category_id (str|int): Category ID
    Returns:
        str: Category name
    """
    main_category_id = get_main_category_id(category_id)
    return CATEGORY_NAME_MAP.get(main_category_id, "unknown") if main_category_id else "unknown"

def get_price_range(amount, category_id):
    """
    Get price range from amount and category
    Args:
        amount (float): Price amount
        category_id (str|int): Category ID
    Returns:
        str: Price range label
    """
    main_category_id = get_main_category_id(category_id) or MAIN_CATEGORIES["ELECTRONICS"]
    
    # Get price ranges for the category
    ranges = PRICE_RANGES.get(main_category_id, PRICE_RANGES[MAIN_CATEGORIES["ELECTRONICS"]])
    
    # Find matching range
    for range_name, range_limits in ranges.items():
        if range_limits["min"] <= amount < range_limits["max"]:
            return range_name
    
    return "unknown"

def normalize_category(category):
    """
    Normalize category names to match taxonomy standards
    Args:
        category (str): Raw category name or ID
    Returns:
        str: Normalized category name
    """
    from .validator import get_category_main_type
    
    if not category:
        return "general"
    
    # Handle numeric category IDs directly
    if isinstance(category, str) and category.isdigit():
        category_id = int(category)
        # Return the proper name from our map if it exists
        if category_id in CATEGORY_NAME_MAP:
            return CATEGORY_NAME_MAP[category_id]
        
        # If not a direct match, get the main category
        main_id = get_main_category_id(category_id)
        if main_id in CATEGORY_NAME_MAP:
            return CATEGORY_NAME_MAP[main_id]
    
    # For string categories, use our validation logic
    return get_category_main_type(category)