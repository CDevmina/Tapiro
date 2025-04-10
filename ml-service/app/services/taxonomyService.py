import yaml
import json
from pathlib import Path
from typing import Dict, List, Optional
from datetime import datetime
from fastapi import HTTPException
import logging
from sentence_transformers import SentenceTransformer
import numpy as np
from app.models.taxonomy import TaxonomyAttribute, TaxonomyCategory, Taxonomy
from app.utils.redis_util import get_cache, set_cache, get_cache_json, set_cache_json, CACHE_KEYS, CACHE_TTL

logger = logging.getLogger(__name__)

class TaxonomyService:
    def __init__(self, db=None):
        self.db = db
        self.taxonomy = None
        self.embedding_model = None
        self.category_embeddings = {}
        
    async def initialize(self):
        """Initialize taxonomy from file and DB"""
        # Try loading from DB first
        if self.db is not None:  # Changed from 'if self.db:'
            cached = await self.db.taxonomy.find_one({"current": True})
            if cached:
                self.taxonomy = Taxonomy(**cached["data"])
                logger.info(f"Loaded taxonomy from DB: {self.taxonomy.version}")
                
        # If not in DB or load failed, use file
        if not self.taxonomy:
            self._load_from_file()
            
            # Save to DB if available
            if self.db is not None:
                await self.db.taxonomy.update_one(
                    {"current": True},
                    {"$set": {"data": self.taxonomy.dict(), "updated_at": datetime.now()}},
                    upsert=True
                )
        
        # Initialize embedding model (try Redis cache first)
        await self._initialize_embeddings()
        
    def _load_from_file(self):
        """Load taxonomy from YAML file"""
        file_path = Path(__file__).parent.parent / "data" / "taxonomy.yaml"
        try:
            with open(file_path, 'r') as file:
                data = yaml.safe_load(file)
                self.taxonomy = Taxonomy(**data)
                logger.info(f"Loaded taxonomy from file: {self.taxonomy.version}")
        except Exception as e:
            logger.error(f"Failed to load taxonomy: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to load taxonomy")
            
    async def _initialize_embeddings(self):
        """Initialize embedding model for search processing"""
        # Try to get embeddings from Redis cache first
        cache_key = f"{CACHE_KEYS['TAXONOMY_EMBEDDINGS']}all"
        cached_embeddings = await get_cache_json(cache_key)
        
        if cached_embeddings:
            try:
                # Convert from list back to numpy arrays
                self.category_embeddings = {k: np.array(v) for k, v in cached_embeddings.items()}
                logger.info(f"Loaded embeddings from Redis cache for {len(self.category_embeddings)} categories")
                
                # Load the model but skip generating embeddings
                model_name = "all-MiniLM-L6-v2"
                self.embedding_model = SentenceTransformer(model_name)
                return
            except Exception as e:
                logger.error(f"Failed to load embeddings from cache: {str(e)}")
                # Continue to generate embeddings
                
        try:
            model_name = "all-MiniLM-L6-v2"  # Good balance of speed and performance
            # Specify a writable cache directory inside the container
            cache_dir = "/app/model_cache"
            self.embedding_model = SentenceTransformer(model_name, cache_folder=cache_dir)
            
            # Generate embeddings for all categories
            for category in self.taxonomy.categories:
                # Create rich text from category name and description
                text = f"{category.name}"
                if category.description:
                    text += f": {category.description}"
                
                # Add attribute information
                for attr in category.attributes:
                    text += f" {attr.name} "
                    text += " ".join(attr.values[:10])  # Use only first 10 values
                
                # Generate embedding
                self.category_embeddings[category.id] = self.embedding_model.encode(text)
                
            logger.info(f"Initialized embeddings for {len(self.category_embeddings)} categories")
            
            # Cache embeddings in Redis
            # Convert numpy arrays to lists for JSON serialization
            cache_data = {k: v.tolist() for k, v in self.category_embeddings.items()}
            await set_cache_json(cache_key, cache_data, {"EX": CACHE_TTL["TAXONOMY_EMBEDDINGS"]})
            logger.info("Cached embeddings in Redis")
            
        except Exception as e:
            logger.error(f"Failed to initialize embeddings: {str(e)}")
            # Continue without embeddings, we'll use rule-based only
            
    def validate_preferences(self, preferences):
        """Validate preference data against taxonomy"""
        if not self.taxonomy:
            raise ValueError("Taxonomy not initialized")
            
        valid_categories = {cat.id: cat for cat in self.taxonomy.categories}
        
        for pref in preferences:
            # Check if category exists
            if pref.category not in valid_categories:
                raise ValueError(f"Invalid category: {pref.category}")
                
            # If attributes provided, validate them
            if pref.attributes:
                category = valid_categories[pref.category]
                valid_attrs = {attr.name: attr.values for attr in category.attributes}
                
                for attr_name, attr_values in pref.attributes.items():
                    # Check attribute exists
                    if attr_name not in valid_attrs:
                        raise ValueError(f"Invalid attribute '{attr_name}' for category '{pref.category}'")
                        
                    # Check values
                    for value in attr_values:
                        if value not in valid_attrs[attr_name]:
                            raise ValueError(f"Invalid value '{value}' for attribute '{attr_name}'")
        
        return True
        
    async def match_category(self, query_text):
        """Match a search query to most relevant category using embeddings"""
        # Try to get from cache first
        cache_key = f"{CACHE_KEYS['TAXONOMY_SEARCH']}{query_text}"
        cached_result = await get_cache_json(cache_key)
        
        if cached_result:
            logger.debug(f"Category match for '{query_text}' found in cache")
            return cached_result
            
        if not self.embedding_model or not self.category_embeddings:
            raise ValueError("Embedding model not initialized")
            
        # Generate embedding for query
        query_embedding = self.embedding_model.encode(query_text)
        
        # Find most similar category
        best_score = -1
        best_category = None
        
        for category_id, category_embedding in self.category_embeddings.items():
            # Compute cosine similarity
            similarity = np.dot(query_embedding, category_embedding) / (
                np.linalg.norm(query_embedding) * np.linalg.norm(category_embedding))
            
            if similarity > best_score:
                best_score = similarity
                best_category = category_id
        
        result = {
            "category": best_category,
            "score": float(best_score),
            "threshold_met":  bool(best_score > 0.2)  # Configurable threshold
        }
        
        # Cache result with short TTL
        await set_cache_json(cache_key, result, {"EX": CACHE_TTL["TAXONOMY_SEARCH"]})
        
        return result

# Singleton instance
_taxonomy_service = None

async def get_taxonomy_service(db=None):
    """Get or create the taxonomy service singleton"""
    global _taxonomy_service
    if _taxonomy_service is None:
        _taxonomy_service = TaxonomyService(db)
        await _taxonomy_service.initialize()
    return _taxonomy_service