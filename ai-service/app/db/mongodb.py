import motor.motor_asyncio
from app.core.config import settings

# MongoDB client instance
client = None
db = None

async def get_database():
    """
    Get database connection
    """
    return db

async def connect_to_mongodb():
    """
    Connect to MongoDB
    """
    global client, db
    client = motor.motor_asyncio.AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.MONGODB_DB_NAME]
    return db

async def close_mongodb_connection():
    """
    Close MongoDB connection
    """
    global client
    if client:
        client.close()