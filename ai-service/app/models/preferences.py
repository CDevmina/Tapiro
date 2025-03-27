from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class UserPreference(BaseModel):
    """User preference for a specific category"""
    category: str
    score: float = Field(..., ge=0.0, le=1.0)
    
class UserPreferences(BaseModel):
    """Collection of user preferences"""
    user_id: str
    preferences: List[UserPreference]
    updated_at: datetime = Field(default_factory=datetime.now)

class UserDataEntry(BaseModel):
    """User data entry from store"""
    email: str
    data_type: str
    entries: List[dict]
    metadata: Optional[dict] = None