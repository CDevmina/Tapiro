"""
Taxonomy validation utilities
This module mirrors the Node.js taxonomyValidator.js functionality
"""
import re
import logging
from .constants import (
    CATEGORY_ATTRIBUTES, CATEGORY_NAME_MAP, CATEGORY_ID_MAP, 
    COMMON_CATEGORY_NAMES, CATEGORY_PATTERNS
)
from .utils import get_main_category_id

logger = logging.getLogger(__name__)

def validate_category_id(category):
    """
    Validate category ID or name against the taxonomy
    Args:
        category (str): Category ID or name to validate
    Returns:
        bool: Whether the category is valid
    """
    # Check if it's a valid numeric category ID
    if isinstance(category, str) and category.isdigit():
        category_num = int(category)
        # Simply check if the ID exists in our name map
        return category_num in CATEGORY_NAME_MAP
    
    # String-based category validation
    # Convert to lowercase for case-insensitive matching
    lowercase_category = str(category).lower()
    
    # Check if it's a known category name in our map
    if lowercase_category in CATEGORY_ID_MAP:
        return True
    
    # Check against common names
    if lowercase_category in COMMON_CATEGORY_NAMES:
        return True
    
    # Check against regex patterns
    for pattern_info in CATEGORY_PATTERNS:
        if re.search(pattern_info["pattern"], lowercase_category, re.IGNORECASE):
            return True
    
    return False

def get_category_main_type(category):
    """
    Determine the main category type for a given category ID or name
    Args:
        category (str): Category ID or name
    Returns:
        str: Lowercase main category name
    """
    # If it's a numeric category
    if isinstance(category, str) and category.isdigit():
        category_num = int(category)
        main_category_id = get_main_category_id(category_num)
        return CATEGORY_NAME_MAP.get(main_category_id, "unknown")
    
    # If it's a string-based category, first check direct mapping
    lowercase_category = str(category).lower()
    if lowercase_category in CATEGORY_ID_MAP:
        category_id = CATEGORY_ID_MAP[lowercase_category]
        main_category_id = get_main_category_id(category_id)
        return CATEGORY_NAME_MAP.get(main_category_id, "unknown")
    
    # Check against patterns
    for pattern_info in CATEGORY_PATTERNS:
        if re.search(pattern_info["pattern"], lowercase_category, re.IGNORECASE):
            return pattern_info["type"]
    
    # Default if no match found
    return "unknown"

def validate_attributes(category, attributes):
    """
    Validate attributes based on category
    Args:
        category (str): Category ID or name
        attributes (dict): Attributes to validate
    Returns:
        dict: Validation result {valid: bool, message: str}
    """
    # Get the main category for this item
    main_category_name = get_category_main_type(category)
    
    # Direct lookup instead of iteration
    main_category_id = CATEGORY_ID_MAP.get(main_category_name)
    
    # If we couldn't determine the main category, we can't validate attributes
    if not main_category_id:
        return {"valid": False, "message": f"Unknown category: {category}"}
    
    # Get valid attributes for this category
    valid_attributes = CATEGORY_ATTRIBUTES.get(main_category_id)
    if not valid_attributes:
        return {"valid": True}  # No specific validation rules for this category
    
    # Check each attribute against the defined valid values
    for attr_name, attr_value in attributes.items():
        # Skip if this attribute isn't defined for this category
        if attr_name not in valid_attributes:
            continue
            
        # If the attribute is defined in our taxonomy, validate its value
        valid_values = valid_attributes[attr_name]
        
        # For attributes with predefined values (arrays)
        if isinstance(valid_values, list) and attr_value not in valid_values:
            return {
                "valid": False,
                "message": f"Invalid {attr_name} for {main_category_name}: {attr_value}. "
                           f"Must be one of: {', '.join(map(str, valid_values))}"
            }
    
    # All validations passed
    return {"valid": True}