import re
from collections import Counter, defaultdict
from app.taxonomy import normalize_category, get_price_range

def extract_features(data_type, entries):
    """Extract features from user data entries"""
    features = {}
    
    # Extract temporal features
    timestamps = [entry.get('timestamp') for entry in entries if 'timestamp' in entry]
    if timestamps:
        features['temporal'] = {
            'newest': max(timestamps),
            'oldest': min(timestamps)
        }
    
    # Extract text-based features
    if data_type == "search":
        search_texts = [entry.get('query', '') for entry in entries if 'query' in entry]
        features['text'] = ' '.join(search_texts)
    elif data_type == "purchase":
        item_names = []
        for entry in entries:
            for item in entry.get('items', []):
                item_names.append(item.get('name', ''))
        features['text'] = ' '.join(item_names)
    
    return features