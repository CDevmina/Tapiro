from app.ai.models.feature_extractor import extract_features
from app.ai.models.preference_model import predict_preferences, predict_attribute_preferences
from app.ai.processors.search_processor import process_search_data, preprocess_search_entries
from app.ai.processors.purchase_processor import process_purchase_data, preprocess_purchase_entries
from app.ai.utils.temporal_utils import apply_time_decay, weight_entries_by_recency
from typing import Dict, Tuple, List, Any
import logging

logger = logging.getLogger(__name__)

# Unified interface for AI processing
async def process_data_with_ai(data_type, entries, existing_preferences=None):
    """
    Process user data with AI to extract preferences using a layered architecture
    
    Args:
        data_type: 'purchase' or 'search'
        entries: List of data entries
        existing_preferences: Current user preferences if available
        
    Returns:
        tuple: (category_counts, attribute_distributions)
    """
    logger.info(f"Processing {len(entries)} {data_type} entries")
    
    # Layer 1: Preprocessing
    if data_type == "purchase":
        processed_entries = preprocess_purchase_entries(entries)
    elif data_type == "search":
        processed_entries = preprocess_search_entries(entries)
    else:
        logger.warning(f"Unknown data type: {data_type}")
        return {}, {}
    
    # Layer 2: Feature Extraction
    features = extract_features(data_type, processed_entries)
    
    # Add temporal weighting to features
    recency_weights = weight_entries_by_recency(entries)
    features['recency_weights'] = recency_weights
    
    # Layer 3 & 4: Inference & Preference Modeling (handled in specific processors)
    if data_type == "purchase":
        category_counts, attribute_distributions = process_purchase_data(processed_entries)
    elif data_type == "search":
        category_counts, attribute_distributions = process_search_data(processed_entries)
    else:
        return {}, {}
    
    # Layer 5: Output Formatting (integrate with preference model)
    # Calculate preference scores
    updated_preferences = predict_preferences(
        {'category_counts': category_counts}, 
        existing_preferences
    )
    
    # Calculate attribute preference distributions
    updated_attributes = predict_attribute_preferences(attribute_distributions)
    
    return updated_preferences, updated_attributes