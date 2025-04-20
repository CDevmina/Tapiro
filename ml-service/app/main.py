from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.router import api_router
from app.db.mongodb import connect_to_mongodb, close_mongodb_connection
# Import the new sync function
from app.services.taxonomyService import sync_taxonomy_with_file

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI Recommendation Service for Tapiro",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=settings.API_PREFIX)

# Create simple root endpoint
@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to Tapiro AI Service",
        "docs": "/docs"
    }

# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    # Connect to DB first
    await connect_to_mongodb()
    # Then sync taxonomy from file to DB
    await sync_taxonomy_with_file()
    # Note: TaxonomyService singleton is initialized on first request via get_taxonomy_service

@app.on_event("shutdown")
async def shutdown_event():
    await close_mongodb_connection()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)