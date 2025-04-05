"""
Tapiro Product Taxonomy Package
This package provides utilities for working with the product taxonomy
"""
from .constants import (
    MAIN_CATEGORIES, SUBCATEGORIES, CATEGORY_ATTRIBUTES, 
    PRICE_RANGES, CATEGORY_NAME_MAP, CATEGORY_ID_MAP
)
from .validator import (
    validate_category_id, get_category_main_type,
    validate_attributes
)
from .utils import (
    get_main_category_id, get_main_category_name,
    get_price_range, normalize_category
)

__all__ = [
    'MAIN_CATEGORIES', 'SUBCATEGORIES', 'CATEGORY_ATTRIBUTES', 
    'PRICE_RANGES', 'CATEGORY_NAME_MAP', 'CATEGORY_ID_MAP',
    'validate_category_id', 'get_category_main_type', 'validate_attributes',
    'get_main_category_id', 'get_main_category_name', 'get_price_range',
    'normalize_category'
]