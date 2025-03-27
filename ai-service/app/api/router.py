from fastapi import APIRouter, Depends
from app.api.endpoints import health, preferences
from app.core.security import get_api_key

# Create the main API router
api_router = APIRouter()

# Include health router without authentication
api_router.include_router(health.router, prefix="/health", tags=["Health"])

# Include preferences router with API key authentication applied to all routes
api_router.include_router(
    preferences.router, 
    prefix="/users", 
    tags=["Preferences"],
    dependencies=[Depends(get_api_key)]
)