from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from app.taxonomy.google_taxonomy import (
    get_taxonomy_tree, 
    get_category_attributes, 
    validate_category,
    get_category_embeddings,
    find_category_by_text,
    get_price_ranges,
    detect_category_type
)
from app.core.cache import cache_response
from app.core.cache_constants import (
    TAXONOMY_TREE_TTL,
    TAXONOMY_ATTRS_TTL,
    TAXONOMY_SEARCH_TTL,
    TAXONOMY_EMBEDDINGS_TTL,
    PRICE_RANGES_TTL,
    TAXONOMY_SCHEMA_TTL
)

router = APIRouter()

@router.get("/tree")  
@cache_response(expire=TAXONOMY_TREE_TTL)
async def taxonomy_tree():
    """Get the full taxonomy tree"""
    return get_taxonomy_tree()

@router.get("/attributes/{category_id}")  
@cache_response(expire=TAXONOMY_ATTRS_TTL)
async def taxonomy_attributes(category_id: str):
    """Get attributes for a specific category"""
    attributes = get_category_attributes(category_id)
    if not attributes:
        raise HTTPException(status_code=404, detail="Category not found")
    return attributes

@router.post("/validate")  
async def validate_product(product: dict):
    """Validate product attributes based on its category"""
    validation = validate_category(product.get("category"), product.get("attributes", {}))
    return validation

@router.post("/validate-batch")
async def validate_products_batch(products: List[dict]):
    """Validate multiple products at once to reduce API calls"""
    results = {}
    for i, product in enumerate(products):
        category_id = product.get("category")
        attributes = product.get("attributes", {})
        results[str(i)] = validate_category(category_id, attributes)
    return results

@router.get("/embeddings")  
@cache_response(expire=TAXONOMY_EMBEDDINGS_TTL)
async def category_embeddings():
    """Get category embeddings for semantic matching"""
    return get_category_embeddings()

@router.get("/search")
@cache_response(expire=TAXONOMY_SEARCH_TTL)
async def search_categories(query: str = Query(...), limit: int = 5):
    """Find categories matching the given text query"""
    results = find_category_by_text(query, top_k=limit)
    return results

@router.get("/price-ranges")
@cache_response(expire=PRICE_RANGES_TTL)
async def price_ranges():
    """Get all price range definitions"""
    return get_price_ranges()

@router.get("/schemas/mongodb")
@cache_response(expire=TAXONOMY_SCHEMA_TTL)
async def mongodb_schemas():
    """Get precomputed MongoDB validation schemas for taxonomy attributes"""
    # Generate schema properties for preference attributes
    preference_props = {}
    data_props = {}
    
    # Get all categories
    taxonomy = get_taxonomy_tree()
    category_ids = []
    
    def extract_category_ids(node, path=[]):
        if isinstance(node, dict):
            if "id" in node:
                category_ids.append(node["id"])
            for key, value in node.items():
                if key != "id" and isinstance(value, dict):
                    extract_category_ids(value)
    
    # Extract category IDs from tree
    extract_category_ids(taxonomy["tree"])
    
    # Generate preference attributes schema
    for category_id in category_ids:
        attributes = get_category_attributes(category_id)
        if not attributes:
            continue
        
        for attr_name, attr_values in attributes.items():
            if attr_name not in preference_props:
                if attr_name == 'price_range':
                    preference_props[attr_name] = {
                        "bsonType": "object",
                        "properties": {
                            "budget": {"bsonType": "double"},
                            "mid_range": {"bsonType": "double"},
                            "premium": {"bsonType": "double"},
                            "luxury": {"bsonType": "double"},
                        }
                    }
                else:
                    preference_props[attr_name] = {"bsonType": "object"}
            
            if attr_name not in data_props and isinstance(attr_values, list):
                data_props[attr_name] = {
                    "bsonType": "string",
                    "enum": attr_values
                }
    
    return {
        "preference_attributes": preference_props,
        "data_attributes": data_props,
        "version": "1.0"
    }

@router.get("/price-range-for-amount")
async def get_price_range_for_amount(amount: float, category_id: Optional[str] = None):
    """Determine price range for an amount in a specific category"""
    price_ranges = get_price_ranges()
    default_ranges = price_ranges["defaultPriceRanges"]
    
    # Use category-specific ranges if available
    ranges_to_use = default_ranges
    
    # Find matching range
    for range_name, range_values in ranges_to_use.items():
        if amount >= range_values["min"] and (range_values["max"] == float('inf') or amount < range_values["max"]):
            return {"range": range_name}
    
    return {"range": "unknown"}
