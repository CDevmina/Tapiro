import os
from functools import lru_cache
import logging
import numpy as np
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

# Use environment variable to determine if we should use embeddings
USE_EMBEDDINGS = os.environ.get("USE_EMBEDDINGS", "true").lower() == "true"

# Global model instance - lazy loaded
_model = None

def get_embedding_model():
    """Get or initialize the embedding model"""
    global _model
    
    if not USE_EMBEDDINGS:
        logger.warning("Embeddings disabled via environment variable")
        return None
        
    if _model is None:
        try:
            logger.info("Loading embedding model...")
            # MiniLM is a good balance of size and performance
            _model = SentenceTransformer('all-MiniLM-L6-v2')
            logger.info("Embedding model loaded successfully")
        except Exception as e:
            logger.error(f"Failed to load embedding model: {str(e)}")
            return None
            
    return _model

@lru_cache(maxsize=1024)
def get_text_embedding(text):
    """Get embedding for text with caching for performance"""
    model = get_embedding_model()
    if model is None or not text:
        return None
    
    try:
        return model.encode(text)
    except Exception as e:
        logger.error(f"Error generating embedding: {str(e)}")
        return None

def calculate_similarity(text1, text2):
    """Calculate similarity between two text strings"""
    if not text1 or not text2:
        return 0
        
    emb1 = get_text_embedding(text1)
    emb2 = get_text_embedding(text2)
    
    if emb1 is None or emb2 is None:
        return 0
        
    # Reshape for sklearn
    emb1 = emb1.reshape(1, -1)
    emb2 = emb2.reshape(1, -1)
    
    return float(cosine_similarity(emb1, emb2)[0][0])

def find_best_match(query, candidates, threshold=0.4):
    """Find best match from candidates for a query"""
    if not query or not candidates:
        return None
        
    model = get_embedding_model()
    if model is None:
        return None
    
    # Get query embedding
    query_embedding = get_text_embedding(query)
    if query_embedding is None:
        return None
        
    # Get candidate embeddings
    best_match = None
    best_score = threshold  # Minimum threshold
    
    for candidate, candidate_id in candidates:
        similarity = calculate_similarity(query, candidate)
        if similarity > best_score:
            best_score = similarity
            best_match = candidate_id
            
    return best_match