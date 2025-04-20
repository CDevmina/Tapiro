from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api.router import api_router
from app.db.mongodb import connect_to_mongodb, close_mongodb_connection, get_database
from app.services.taxonomyService import TaxonomyService, get_taxonomy_service
import logging
import yaml
from pathlib import Path
from datetime import datetime

logger = logging.getLogger(__name__)

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

# Startup events
@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongodb()

@app.on_event("startup")
async def initialize_taxonomy():
    """Initialize taxonomy service and ensure DB is updated with latest version"""
    logger.info("Initializing taxonomy service...")
    try:
        # Get DB connection
        db = await get_database()
        
        # Check current version in YAML file
        file_path = Path(__file__).parent / "data" / "taxonomy.yaml"
        with open(file_path, 'r') as file:
            data = yaml.safe_load(file)
            file_version = data.get("version")
        
        # Check if version exists in DB
        db_taxonomy = await db.taxonomy.find_one({"current": True})
        
        if db_taxonomy:
            db_version = db_taxonomy["data"].get("version")
            logger.info(f"Current DB taxonomy version: {db_version}")
            
            # If file version is newer, force re-initialization
            if file_version != db_version:
                logger.info(f"Taxonomy version changed: {db_version} → {file_version}")
                # Remove current taxonomy to force reload from file
                await db.taxonomy.delete_one({"current": True})
        else:
            logger.info("No taxonomy found in database, will initialize from file")
        
        # Initialize taxonomy service (will load from file if needed)
        taxonomy_service = await get_taxonomy_service(db)
        logger.info(f"Taxonomy service initialized with version {taxonomy_service.taxonomy.version}")
        
    except Exception as e:
        logger.error(f"Failed to initialize taxonomy service: {str(e)}")
        # Don't raise exception to allow server to start anyway

# Shutdown events
@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongodb_connection()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)