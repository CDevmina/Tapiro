from collections import Counter, defaultdict
import logging
from app.taxonomy import normalize_category, get_price_range
from app.taxonomy.constants import MAIN_CATEGORIES, SUBCATEGORIES
from app.ai.models.embedding_model import find_best_match
from app.ai.utils.taxonomy_mapper import get_category_embedding_candidates, build_keyword_category_mapping

logger = logging.getLogger(__name__)

def process_purchase_data(entries):
    """Process purchase data with hybrid AI enhancements"""
    category_counts = Counter()
    attribute_distributions = defaultdict(lambda: defaultdict(Counter))
    
    for entry in entries:
        for item in entry.get('items', []):
            # Extract category data
            raw_category = item.get('category', '')
            category = normalize_category(raw_category)
            
            if not category:
                # HYBRID APPROACH: First try rule-based method (faster)
                item_name = item.get('name', '').lower()
                inferred_category = infer_category_from_text_rules(item_name)
                
                # If rule-based fails, try embedding-based method (more powerful)
                if not inferred_category:
                    inferred_category = infer_category_from_text_embeddings(item_name)
                    if inferred_category:
                        logger.info(f"AI inferred category {inferred_category} from '{item_name}' using embeddings")
                
                if inferred_category:
                    category = inferred_category
            
            if not category:
                continue
                
            # Add to category counts with weighted importance
            price = item.get('price', 0)
            quantity = item.get('quantity', 1)
            importance = calculate_item_importance(price, quantity)
            category_counts[category] += importance
            
            # Process attributes with smarter extraction
            process_item_attributes(item, category, attribute_distributions)
            
    return category_counts, attribute_distributions

def infer_category_from_text_rules(text):
    """Rule-based category inference (fast, handles common cases)"""
    if not text:
        return None
        
    # Get keyword mapping from taxonomy
    keyword_mapping = build_keyword_category_mapping()
    
    # Search for keyword matches
    text_lower = text.lower()
    for keyword, category in keyword_mapping.items():
        if keyword in text_lower:
            logger.debug(f"Rule-based match: '{keyword}' in '{text_lower}' → {category}")
            return category
    
    return None

def infer_category_from_text_embeddings(text):
    """Embedding-based category inference (more powerful for edge cases)"""
    if not text:
        return None
        
    # Get category candidates for matching
    candidates = get_category_embedding_candidates()
    
    # Find best semantic match
    best_match = find_best_match(text, candidates)
    
    return best_match

def calculate_item_importance(price, quantity):
    """Calculate item importance based on price and quantity"""
    # Items with higher price or quantity are considered more important
    # This is a simple heuristic that can be improved with ML later
    base_importance = 1.0
    
    # Price factor (higher price = slightly more important)
    price_factor = min(price / 100, 3) if price > 0 else 1
    
    # Quantity factor (higher quantity = more important)
    quantity_factor = min(quantity, 5) if quantity > 0 else 1
    
    return base_importance * (price_factor * 0.5 + quantity_factor * 0.5)

def process_item_attributes(item, category, attribute_distributions):
    """Process item attributes with AI enhancements"""
    # Extract explicit attributes
    attributes = item.get('attributes', {})
    
    # Add price range as an attribute
    if 'price' in item:
        price_range = get_price_range(item['price'], category)
        attribute_distributions[category]['price_range'][price_range] += 1
    
    # Add explicit attributes
    for attr_name, attr_value in attributes.items():
        if attr_value:
            attribute_distributions[category][attr_name][attr_value.lower()] += 1
    
    # Extract implicit attributes from item name
    item_name = item.get('name', '').lower()
    extract_implicit_attributes(item_name, category, attribute_distributions)

def extract_implicit_attributes(text, category, attribute_distributions):
    """Extract implicit attributes from text using taxonomy"""
    # Dynamic mapping instead of hardcoded colors
    # For electronics subcategories
    if category.startswith('10'):  # Electronics
        extract_electronics_attributes(text, category, attribute_distributions)
    elif category.startswith('20'):  # Clothing
        extract_clothing_attributes(text, category, attribute_distributions)
    elif category.startswith('30'):  # Home & Garden
        extract_home_attributes(text, category, attribute_distributions)
    # Add more category-specific extractors as needed

def extract_electronics_attributes(text, category, attribute_distributions):
    """Extract attributes for electronics"""
    # Extract common colors for electronics
    colors = ["black", "white", "silver", "gold", "blue", "red"]
    for color in colors:
        if color in text:
            attribute_distributions[category]['color'][color] += 0.5
            
    # Extract brand information
    brands = ["apple", "samsung", "sony", "google", "lg"]
    for brand in brands:
        if brand in text:
            attribute_distributions[category]['brand'][brand] += 0.5
    
    # Extract features
    features = ["wireless", "smart", "portable", "gaming", "waterproof"]
    for feature in features:
        if feature in text:
            attribute_distributions[category]['feature'][feature] += 0.5

def extract_clothing_attributes(text, category, attribute_distributions):
    """Extract attributes for clothing"""
    # Extract material
    materials = ["cotton", "wool", "polyester", "leather", "denim"]
    for material in materials:
        if material in text:
            attribute_distributions[category]['material'][material] += 0.5
            
    # Extract style
    styles = ["casual", "formal", "sport", "vintage", "business"]
    for style in styles:
        if style in text:
            attribute_distributions[category]['style'][style] += 0.5

def extract_home_attributes(text, category, attribute_distributions):
    """Extract attributes for home & garden"""
    # Extract material
    materials = ["wood", "metal", "plastic", "glass", "fabric"]
    for material in materials:
        if material in text:
            attribute_distributions[category]['material'][material] += 0.5
            
    # Extract room type
    rooms = ["living", "bedroom", "kitchen", "bathroom", "office"]
    for room in rooms:
        if room in text:
            attribute_distributions[category]['room'][room] += 0.5