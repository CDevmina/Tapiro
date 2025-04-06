from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Literal
from datetime import datetime

class UserPreference(BaseModel):
    """User preference for a specific category"""
    category: str
    score: float = Field(..., ge=0.0, le=1.0)
    attributes: Optional[Dict[str, Dict[str, float]]] = None
    
class UserPreferences(BaseModel):
    """Collection of user preferences"""
    user_id: str
    preferences: List[UserPreference]
    updated_at: datetime = Field(default_factory=datetime.now)

class UserDataEntry(BaseModel):
    """User data entry from store"""
    email: str
    data_type: Literal['purchase', 'search'] 
    entries: List[dict]
    metadata: Optional[dict] = None