import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Settings(BaseSettings):
    """Application settings."""
    
    # API Settings
    API_PREFIX: str = "/api"
    PROJECT_NAME: str = "Tapiro AI Service"
    DEBUG: bool = os.getenv("DEBUG", "False").lower() == "true"
    VERSION: str = "1.0.0"
    
    # MongoDB Settings
    MONGODB_URI: str = os.getenv("MONGODB_URI", "mongodb://localhost:27017")
    MONGODB_DB_NAME: str = os.getenv("MONGODB_DB_NAME", "tapiro")
    
    # Security
    API_KEY_NAME: str = "X-API-Key"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-for-development-only")
    
    # Node.js Backend API
    BACKEND_API_URL: str = os.getenv("BACKEND_API_URL", "http://backend:3000")
    
    # CORS Settings
    BACKEND_CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:5173",
        "http://backend:3000",
        "http://web:5173"
    ]
    
    # Redis settings
    REDIS_HOST: str = "redis"
    REDIS_PORT: int = 6379

# Create global settings object
settings = Settings()