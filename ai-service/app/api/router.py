from fastapi import APIRouter
from app.api.endpoints import health, preferences

# Create the main API router
api_router = APIRouter()

# Include routers from endpoint modules
api_router.include_router(health.router, prefix="/health", tags=["Health"])
api_router.include_router(preferences.router, prefix="/users", tags=["Preferences"])