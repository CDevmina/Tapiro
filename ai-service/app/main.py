from fastapi import FastAPI, Depends, Security
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security.api_key import APIKeyHeader
from app.core.config import settings
from app.api.router import api_router
from app.db.mongodb import connect_to_mongodb, close_mongodb_connection

# Define API key security scheme
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(name=API_KEY_NAME, auto_error=False)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="AI Recommendation Service for Tapiro - Provides personalized product recommendations based on user behavior and preferences",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_tags=[
        {"name": "Root", "description": "Root endpoint"},
        {"name": "Health", "description": "Health check endpoints"},
        {"name": "Preferences", "description": "User preference management endpoints"},
    ]
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
async def startup_db_client():
    await connect_to_mongodb()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongodb_connection()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)