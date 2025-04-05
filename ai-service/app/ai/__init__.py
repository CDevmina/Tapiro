from app.ai.models.feature_extractor import extract_features
from app.ai.models.preference_model import predict_preferences
from app.ai.processors.search_processor import process_search_data
from app.ai.processors.purchase_processor import process_purchase_data

# Unified interface for AI processing
async def process_data_with_ai(data_type, entries, existing_preferences=None):
    """
    Process user data with AI to extract preferences
    
    Args:
        data_type: 'purchase' or 'search'
        entries: List of data entries
        existing_preferences: Current user preferences if available
        
    Returns:
        tuple: (category_counts, attribute_distributions)
    """
    if data_type == "purchase":
        return process_purchase_data(entries)
    elif data_type == "search":
        return process_search_data(entries)
    else:
        return {}, {}