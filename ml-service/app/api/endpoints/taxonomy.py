from fastapi import APIRouter, HTTPException, Depends
from app.services.taxonomyService import get_taxonomy_service
from app.db.mongodb import get_database
from typing import Dict, Any

router = APIRouter()

@router.get(
    "/schemas/mongodb",
    response_model=Dict[str, Dict[str, Any]],
    summary="Get MongoDB schemas"
)
async def get_mongodb_schemas(
    taxonomy=Depends(get_taxonomy_service),
):
    """Get MongoDB schema definitions for taxonomy attributes"""
    try:
        schemas = taxonomy.get_mongodb_schemas()
        return schemas
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate schemas: {str(e)}")

@router.get(
    "/search",
    summary="Search taxonomy categories"
)
async def search_taxonomy(
    query: str,
    taxonomy=Depends(get_taxonomy_service),
):
    """Search taxonomy categories by query text"""
    try:
        result = await taxonomy.match_category(query)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@router.get(
    "/health",
    summary="Check taxonomy service health"
)
async def check_health(
    taxonomy=Depends(get_taxonomy_service),
):
    """Check if taxonomy service is healthy"""
    try:
        return {
            "status": "healthy",
            "version": taxonomy.taxonomy.version if taxonomy.taxonomy else "unknown",
            "categories": len(taxonomy.taxonomy.categories) if taxonomy.taxonomy else 0,
            "embeddings": "initialized" if taxonomy.embedding_model else "not initialized"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "error": str(e)
        }