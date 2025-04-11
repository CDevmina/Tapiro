from typing import List, Optional
from pydantic import BaseModel

class TaxonomyAttribute(BaseModel):
    """Attribute within a taxonomy category"""
    name: str
    values: List[str]
    description: Optional[str] = None

class TaxonomyCategory(BaseModel):
    """Category within a taxonomy system"""
    id: str
    name: str
    parent_id: Optional[str] = None
    description: Optional[str] = None
    attributes: List["TaxonomyAttribute"] = []
    
class Taxonomy(BaseModel):
    """Complete taxonomy definition with categories"""
    categories: List[TaxonomyCategory]
    version: str