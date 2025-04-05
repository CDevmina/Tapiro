import re
from collections import Counter, defaultdict
import logging
from app.ai.models.embedding_model import find_best_match
from app.ai.utils.taxonomy_mapper import get_category_embedding_candidates, build_keyword_category_mapping

logger = logging.getLogger(__name__)

def analyze_search_query(query):
    """
    Analyze search query with semantic understanding
    
    Args:
        query: User search query text
        
    Returns:
        dict: Analysis with categories and attributes
    """
    result = {
        'categories': {},
        'attributes': defaultdict(lambda: defaultdict(dict))
    }
    
    if not query:
        return result
    
    # Get keywords and phrases
    keywords = extract_keywords(query)
    
    # Hybrid approach for category matching
    
    # 1. First try rule-based for common cases (fast)
    rule_categories = map_keywords_to_categories_rules(keywords)
    
    # 2. If no strong match, try embedding-based (more powerful)
    if not rule_categories or max(rule_categories.values()) < 0.5:
        embedding_categories = map_query_to_categories_embeddings(query)
        # Combine both approaches, with embedding results given higher weight
        for cat, score in embedding_categories.items():
            rule_score = rule_categories.get(cat, 0)
            # Weighted combination favoring embeddings
            result['categories'][cat] = 0.3 * rule_score + 0.7 * score
    else:
        result['categories'] = rule_categories
    
    # Extract explicit attributes
    
    # Price range
    price_range = extract_price_indication(query)
    if price_range:
        for category in result['categories']:
            result['attributes'][category]['price_range'] = {price_range: 1.0}
    
    # Extract other attributes (color, material, etc.)
    for category in result['categories']:
        extract_common_attributes(query, category, result['attributes'][category])
    
    return result

def extract_keywords(text):
    """Extract meaningful keywords from text"""
    if not text:
        return []
        
    # Remove common stop words
    stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for'}
    text = text.lower()
    
    # Replace punctuation with spaces
    text = re.sub(r'[^\w\s]', ' ', text)
    
    # Split and filter
    words = text.split()
    return [w for w in words if w not in stop_words and len(w) > 1]

def map_keywords_to_categories_rules(keywords):
    """Map keywords to categories using rule-based approach"""
    if not keywords:
        return {}
        
    # Get mapping
    keyword_mapping = build_keyword_category_mapping()
    
    # Track matched categories
    category_scores = Counter()
    
    # Look for keyword matches
    for word in keywords:
        if word in keyword_mapping:
            category = keyword_mapping[word]
            category_scores[category] += 1
    
    # Normalize scores
    total = sum(category_scores.values()) or 1
    return {k: v/total for k, v in category_scores.items()}

def map_query_to_categories_embeddings(query):
    """Map query to categories using embedding similarity"""
    if not query:
        return {}
        
    candidates = get_category_embedding_candidates()
    
    # Find best semantic matches with scores
    category_scores = {}
    for candidate, category_id in candidates:
        # Use embedding model to calculate similarity
        from app.ai.models.embedding_model import calculate_similarity
        score = calculate_similarity(query, candidate)
        
        if score > 0.4:  # Threshold
            current = category_scores.get(category_id, 0)
            category_scores[category_id] = max(current, score)
    
    # Normalize scores
    if category_scores:
        total = sum(category_scores.values())
        return {k: v/total for k, v in category_scores.items()}
    
    return {}

def extract_price_indication(query):
    """Extract price range indications from query"""
    query_lower = query.lower()
    
    # Budget indicators
    if any(term in query_lower for term in ['cheap', 'inexpensive', 'affordable', 'budget']):
        return 'budget'
    
    # Premium indicators
    if any(term in query_lower for term in ['premium', 'high-end', 'high end', 'quality']):
        return 'premium'
    
    # Luxury indicators
    if any(term in query_lower for term in ['luxury', 'luxurious', 'expensive', 'high-class']):
        return 'luxury'
    
    # Default to mid-range if price is mentioned but no specific tier
    if any(term in query_lower for term in ['price', 'cost', '$']):
        return 'mid_range'
    
    return None

def extract_common_attributes(query, category, attr_results):
    """Extract common attributes from query based on category"""
    query_lower = query.lower()
    
    # Extract color
    colors = ["black", "white", "red", "blue", "green", "silver", "gold"]
    for color in colors:
        if color in query_lower:
            if 'color' not in attr_results:
                attr_results['color'] = {}
            attr_results['color'][color] = 1.0
            break
    
    # For electronics
    if str(category).startswith('10'):
        brands = ["apple", "samsung", "sony", "google", "lg"]
        for brand in brands:
            if brand in query_lower:
                if 'brand' not in attr_results:
                    attr_results['brand'] = {}
                attr_results['brand'][brand] = 1.0
                break
    
    # For clothing
    elif str(category).startswith('20'):
        materials = ["cotton", "wool", "leather", "denim"]
        for material in materials:
            if material in query_lower:
                if 'material' not in attr_results:
                    attr_results['material'] = {}
                attr_results['material'][material] = 1.0
                break
    
    # Similar patterns for other category types...