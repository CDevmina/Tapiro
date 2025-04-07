from fastapi import APIRouter, HTTPException, Query
from app.taxonomy.google_taxonomy import (
    get_taxonomy_tree, 
    get_category_attributes, 
    validate_category,
    get_category_embeddings,
    find_category_by_text,
    get_price_ranges
)
from app.core.cache import cache_response

router = APIRouter()

@router.get("/tree")  
@cache_response(expire=3600)
async def taxonomy_tree():
    """Get the full taxonomy tree"""
    return get_taxonomy_tree()

@router.get("/attributes/{category_id}")  
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

@router.get("/embeddings")  
@cache_response(expire=86400)
async def category_embeddings():
    """Get category embeddings for semantic matching"""
    return get_category_embeddings()

@router.get("/search")
async def search_categories(query: str = Query(...), limit: int = 5):
    """Find categories matching the given text query"""
    results = find_category_by_text(query, top_k=limit)
    return results

# Update the price-ranges endpoint

@router.get("/price-ranges")
@cache_response(expire=86400)
async def price_ranges():
    """Get all price range definitions"""
    return get_price_ranges()

@router.get("/health")
async def health_check():
    """Check taxonomy service health"""
    return {"status": "ok", "version": "google_product_categories_2025"}