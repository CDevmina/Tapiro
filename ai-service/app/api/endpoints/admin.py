from fastapi import APIRouter, Depends, HTTPException
from app.core.security import get_api_key
from app.ai.utils.taxonomy_mapper import build_keyword_category_mapping, invalidate_mapping_cache

router = APIRouter()

@router.get(
    "/taxonomy/keyword-mappings",
    description="Get all current keyword mappings",
    summary="Get keyword mappings"
)
async def get_keyword_mappings():
    """Get all current keyword to category mappings"""
    try:
        mappings = build_keyword_category_mapping()
        return mappings
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error retrieving keyword mappings: {str(e)}"
        )

@router.post(
    "/taxonomy/keyword-mappings/regenerate",
    description="Force regeneration of keyword mappings",
    summary="Regenerate keyword mappings"
)
async def regenerate_keyword_mappings():
    """Force regeneration of all keyword mappings"""
    try:
        # First invalidate the cache to force rebuild
        invalidate_mapping_cache()
        
        # Then build fresh mappings
        mappings = build_keyword_category_mapping()
        
        return {
            "message": "Keyword mappings regenerated successfully",
            "count": len(mappings)
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error regenerating keyword mappings: {str(e)}"
        )

@router.post(
    "/cache/invalidate",
    description="Invalidate various caches",
    summary="Invalidate caches"
)
async def invalidate_cache(cache_type: str = "taxonomy"):
    """Invalidate various caches in the AI service"""
    try:
        if cache_type == "taxonomy":
            invalidate_mapping_cache()
            return {"message": "Taxonomy caches invalidated successfully"}
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown cache type: {cache_type}"
            )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error invalidating cache: {str(e)}"
        )