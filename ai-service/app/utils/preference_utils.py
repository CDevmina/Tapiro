import logging
from typing import Any

# Configure logging
logger = logging.getLogger(__name__)

async def mark_processing_failed(db, email: str):
    """Mark userData processing as failed when errors occur"""
    try:
        await db.userData.update_one(
            {"email": email, "processedStatus": "pending"},
            {"$set": {"processedStatus": "failed"}}
        )
        logger.info(f"Marked processing failed for {email}")
    except Exception as e:
        logger.error(f"Failed to update status to failed: {str(e)}")