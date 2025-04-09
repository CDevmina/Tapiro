from fastapi import APIRouter, HTTPException, Depends, Body, BackgroundTasks
from app.models.preferences import UserDataEntry
from app.db.mongodb import get_database
from app.services.preferenceProcessor import process_user_data
from app.utils.preference_utils import mark_processing_failed
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()

@router.post(
    "/data/process", 
    status_code=202,
    description="Process user data to update preferences",
    summary="Process user data"
)
async def process_user_data_endpoint(
    data: UserDataEntry = Body(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    db=Depends(get_database)
):
    """Process user data to update preferences"""
    # Extract user_id for logging
    user_id = data.metadata.get("userId", data.email) if data.metadata else data.email
    email = data.email
    data_type = data.data_type
    entries = data.entries
    
    logger.info(f"POST request received for data processing:")
    logger.info(f"  User: {user_id}")
    logger.info(f"  Data type: {data_type}")
    logger.info(f"  Number of entries: {len(data.entries)}")
    
    try:
        result = await process_user_data(data, db)
        
        return {
            "status": "success",
            "message": "Data processed successfully",
            "user_id": result.user_id,
            "preferences_updated": True,
            "preferences_count": len(result.preferences),
            "attributes_processed": {}
        }
    except HTTPException as e:
        # For user errors, mark processing as failed
        background_tasks.add_task(mark_processing_failed, db, email)
        raise e
    except Exception as e:
        # For system errors, also mark processing as failed
        background_tasks.add_task(mark_processing_failed, db, email)
        
        # Log the error and return a 500 error
        logger.error(f"Error processing data: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Error processing data: {str(e)}"
        )