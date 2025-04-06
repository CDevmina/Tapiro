from collections import Counter, defaultdict
import re
from app.ai.utils.text_analyzer import analyze_search_query, extract_keywords
from app.ai.models.embedding_model import find_best_match, calculate_similarity
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

def preprocess_search_entries(entries):
    """
    Preprocess search entries to normalize and clean data
    
    Args:
        entries: Raw search entries from API
        
    Returns:
        list: Preprocessed entries
    """
    preprocessed = []
    
    for entry in entries:
        # Skip empty entries
        if not entry or "query" not in entry or not entry["query"]:
            continue
            
        # Clean and normalize query
        query = entry.get("query", "").strip()
        if not query:
            continue
            
        # Parse timestamp if it's a string
        timestamp = entry.get("timestamp")
        if isinstance(timestamp, str):
            try:
                timestamp = datetime.fromisoformat(timestamp.replace("Z", "+00:00"))
                entry["timestamp"] = timestamp
            except:
                pass
                
        # Add to preprocessed entries
        preprocessed.append(entry)
    
    return preprocessed

def process_search_data(entries):
    """Process search data with AI enhancements"""
    category_counts = Counter()
    attribute_distributions = defaultdict(lambda: defaultdict(Counter))
    
    # Collect all search queries for batch processing
    search_queries = []
    for entry in entries:
        query = entry.get('query', '').strip()
        if query:
            search_queries.append({
                'query': query,
                'timestamp': entry.get('timestamp'),
                'clicked': entry.get('clicked', []),
                'category': entry.get('category')
            })
    
    # Process each query
    for search_data in search_queries:
        query = search_data['query']
        
        # AI enhanced query analysis
        analysis = analyze_search_query(query)
        
        # Update category interests
        for category, score in analysis['categories'].items():
            category_counts[category] += score
        
        # Update attribute interests
        for category, attrs in analysis['attributes'].items():
            for attr_name, attr_values in attrs.items():
                for value, score in attr_values.items():
                    attribute_distributions[category][attr_name][value] += score
    
    return category_counts, attribute_distributions