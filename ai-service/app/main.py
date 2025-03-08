from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

app = FastAPI(
    title="Tapiro AI Service",
    description="AI Recommendation Service for Tapiro",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure with your actual origins in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "service": "tapiro-ai"
    }

# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to Tapiro AI Service",
        "docs": "/docs"
    }

class UserPreference(BaseModel):
    category: str
    score: float

class UserPreferences(BaseModel):
    user_id: str
    preferences: List[UserPreference]
    updated_at: datetime

# Placeholder endpoint for user preferences
@app.get("/api/users/{user_id}/preferences", response_model=UserPreferences)
async def get_user_preferences(user_id: str):
    """
    Get user preferences based on their history
    This is currently a placeholder that will be connected to ML models
    """
    # Mock data - will be replaced with actual ML model predictions
    return {
        "user_id": user_id,
        "preferences": [
            {"category": "electronics", "score": 0.85},
            {"category": "books", "score": 0.65},
            {"category": "fashion", "score": 0.45}
        ],
        "updated_at": datetime.now()
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)