from collections import Counter

def extract_features(data_type, entries):
    """
    Extract features from user data entries
    
    Args:
        data_type: 'purchase' or 'search'
        entries: List of data entries
        
    Returns:
        dict: Features extracted from entries
    """
    features = {}
    
    # Extract temporal features
    timestamps = [entry.get('timestamp') for entry in entries if 'timestamp' in entry]
    if timestamps:
        # Filter out None values
        timestamps = [ts for ts in timestamps if ts]
        
        if timestamps:
            features['temporal'] = {
                'newest': max(timestamps),
                'oldest': min(timestamps),
                'count': len(timestamps),
                'time_span_days': (max(timestamps) - min(timestamps)).days if len(timestamps) > 1 else 0
            }
    
    # Extract categorical distribution features
    if data_type == "purchase":
        category_dist = Counter()
        price_sum = 0
        item_count = 0
        
        for entry in entries:
            for item in entry.get('items', []):
                category = item.get('category')
                if category:
                    category_dist[category] += 1
                    
                price = item.get('price', 0)
                if price:
                    price_sum += float(price)
                    item_count += 1
        
        features['categorical'] = dict(category_dist)
        
        if item_count > 0:
            features['avg_price'] = price_sum / item_count
    
    # Extract text-based features
    if data_type == "search":
        search_texts = [entry.get('query', '') for entry in entries if 'query' in entry]
        features['text'] = ' '.join(search_texts)
        
        # Add query length stats
        if search_texts:
            query_lengths = [len(query.split()) for query in search_texts if query]
            features['avg_query_length'] = sum(query_lengths) / len(query_lengths) if query_lengths else 0
    elif data_type == "purchase":
        item_names = []
        categories = set()
        for entry in entries:
            for item in entry.get('items', []):
                item_names.append(item.get('name', ''))
                if item.get('category'):
                    categories.add(item.get('category'))
        
        features['text'] = ' '.join(item_names)
        features['unique_categories'] = len(categories)
    
    return features