from collections import Counter, defaultdict
import re
from app.ai.utils.text_analyzer import analyze_search_query, extract_keywords
import logging

logger = logging.getLogger(__name__)

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