"""
Tapiro Product Taxonomy Constants
This file is AUTO-GENERATED from taxonomy.json - DO NOT MODIFY DIRECTLY
Generated on: 2025-04-05T10:02:42.681Z
Version: 1.0.2
"""

# Main Categories
MAIN_CATEGORIES = {
    "ELECTRONICS": 100,
    "CLOTHING": 200,
    "HOME_GARDEN": 300,
    "BEAUTY_PERSONAL_CARE": 400,
    "SPORTS_OUTDOORS": 500,
    "BOOKS_MEDIA": 600,
    "FOOD_GROCERY": 700,
    "AUTOMOTIVE": 800,
    "HEALTH_WELLNESS": 900,
    "TOYS_GAMES": 1000,
}

# Subcategories
SUBCATEGORIES = {

    # ELECTRONICS
    "SMARTPHONES": 101,
    "COMPUTERS": 102,
    "AUDIO": 103,
    "TVS_DISPLAYS": 104,
    "CAMERAS": 105,
    "WEARABLES": 106,
    "GAMING": 107,
    "SMART_HOME": 108,
    "TABLETS": 109,
    "ELECTRONICS_ACCESSORIES": 110,

    # CLOTHING
    "MENS_CLOTHING": 201,
    "WOMENS_CLOTHING": 202,
    "CHILDRENS_CLOTHING": 203,
    "FOOTWEAR": 204,
    "CLOTHING_ACCESSORIES": 205,
    "ACTIVEWEAR": 206,
    "FORMAL_WEAR": 207,
    "UNDERWEAR": 208,
    "SEASONAL": 209,
    "SUSTAINABLE_FASHION": 210,

    # HOME_GARDEN
    "FURNITURE": 301,
    "KITCHEN": 302,
    "HOME_DECOR": 303,
    "BEDDING_BATH": 304,
    "STORAGE": 305,
    "GARDEN": 306,
    "LIGHTING": 307,
    "APPLIANCES": 308,
    "HOME_IMPROVEMENT": 309,
    "HOME_OFFICE": 310,
}

# Attributes by category
CATEGORY_ATTRIBUTES = {
    MAIN_CATEGORIES["ELECTRONICS"]: {
        "price_range": ["budget", "mid_range", "premium", "luxury"],
        "brand": ["apple", "samsung", "sony", "google", "lg", "other"],
        "color": ["black", "white", "silver", "gold", "blue", "red", "other"],
        "feature": ["wireless", "smart", "portable", "gaming", "waterproof"],
        "rating": [1, 2, 3, 4, 5],
        "release_year": "numeric",
    },
    MAIN_CATEGORIES["CLOTHING"]: {
        "price_range": ["budget", "mid_range", "premium", "luxury"],
        "color": ["black", "white", "blue", "red", "green", "yellow", "pink", "other"],
        "material": ["cotton", "wool", "polyester", "leather", "denim", "other"],
        "size": ["xs", "s", "m", "l", "xl", "xxl"],
        "style": ["casual", "formal", "sport", "vintage", "business"],
        "season": ["summer", "winter", "spring", "fall", "all_season"],
        "gender": ["men", "women", "unisex", "children"],
    },
    MAIN_CATEGORIES["HOME_GARDEN"]: {
        "price_range": ["budget", "mid_range", "premium", "luxury"],
        "color": ["black", "white", "wood", "metal", "beige", "grey", "other"],
        "material": ["wood", "metal", "plastic", "glass", "fabric", "other"],
        "style": ["modern", "traditional", "minimalist", "industrial", "rustic"],
        "room": ["living", "bedroom", "kitchen", "bathroom", "office", "outdoor"],
        "size": ["small", "medium", "large"],
    },
}

# Price range definitions by category
PRICE_RANGES = {
    MAIN_CATEGORIES["ELECTRONICS"]: {
        "budget": {"min": 0, "max": 100},
        "mid_range": {"min": 100, "max": 500},
        "premium": {"min": 500, "max": 1000},
        "luxury": {"min": 1000, "max": float('inf')},
    },
    MAIN_CATEGORIES["CLOTHING"]: {
        "budget": {"min": 0, "max": 30},
        "mid_range": {"min": 30, "max": 100},
        "premium": {"min": 100, "max": 300},
        "luxury": {"min": 300, "max": float('inf')},
    },
    MAIN_CATEGORIES["HOME_GARDEN"]: {
        "budget": {"min": 0, "max": 50},
        "mid_range": {"min": 50, "max": 200},
        "premium": {"min": 200, "max": 500},
        "luxury": {"min": 500, "max": float('inf')},
    },
    MAIN_CATEGORIES["BEAUTY_PERSONAL_CARE"]: {
        "budget": {"min": 0, "max": 15},
        "mid_range": {"min": 15, "max": 50},
        "premium": {"min": 50, "max": 100},
        "luxury": {"min": 100, "max": float('inf')},
    },
    MAIN_CATEGORIES["SPORTS_OUTDOORS"]: {
        "budget": {"min": 0, "max": 25},
        "mid_range": {"min": 25, "max": 100},
        "premium": {"min": 100, "max": 300},
        "luxury": {"min": 300, "max": float('inf')},
    },
}

# Common names for categories (for text-based detection)
COMMON_CATEGORY_NAMES = [
    "smartphones",
    "computers",
    "audio",
    "tvs",
    "cameras",
    "wearables",
    "gaming",
    "smart home",
    "tablets",
    "accessories",
    "clothing",
    "fashion",
    "shirts",
    "pants",
    "dresses",
    "furniture",
    "kitchen",
    "decor",
    "lighting",
    "garden"
]

# Category identification patterns
CATEGORY_PATTERNS = [
    {
        "pattern": r"electronics|smartphone|computer|audio|tv|camera|wearable|gaming|tablet",
        "type": "electronics",
        "id": MAIN_CATEGORIES["ELECTRONICS"],
    },
    {
        "pattern": r"clothing|fashion|apparel|wear|shoe|dress|pant|shirt",
        "type": "clothing",
        "id": MAIN_CATEGORIES["CLOTHING"],
    },
    {
        "pattern": r"home|furniture|kitchen|decor|garden|lighting|appliance",
        "type": "home_garden",
        "id": MAIN_CATEGORIES["HOME_GARDEN"],
    },
    {
        "pattern": r"beauty|cosmetic|makeup|skincare|personal care",
        "type": "beauty_personal_care",
        "id": MAIN_CATEGORIES["BEAUTY_PERSONAL_CARE"],
    },
    {
        "pattern": r"sports|outdoors|fitness|exercise|recreation",
        "type": "sports_outdoors",
        "id": MAIN_CATEGORIES["SPORTS_OUTDOORS"],
    },
    {
        "pattern": r"books|media|reading|e-?book|audio ?book",
        "type": "books_media",
        "id": MAIN_CATEGORIES["BOOKS_MEDIA"],
    },
    {
        "pattern": r"food|grocery|beverage|drink|snack",
        "type": "food_grocery",
        "id": MAIN_CATEGORIES["FOOD_GROCERY"],
    },
    {
        "pattern": r"automotive|car|vehicle|auto",
        "type": "automotive",
        "id": MAIN_CATEGORIES["AUTOMOTIVE"],
    },
    {
        "pattern": r"health|wellness|medical|supplement",
        "type": "health_wellness",
        "id": MAIN_CATEGORIES["HEALTH_WELLNESS"],
    },
    {
        "pattern": r"toys|games|entertainment|plaything",
        "type": "toys_games",
        "id": MAIN_CATEGORIES["TOYS_GAMES"],
    }
]

# Pre-compute category name maps
CATEGORY_NAME_MAP = {}
CATEGORY_ID_MAP = {}

def format_category_name(name):
    """Format a category name from constant to user-friendly format"""
    return name.lower().replace("_", " ")

# Build maps
for name, id_value in MAIN_CATEGORIES.items():
    formatted_name = format_category_name(name)
    CATEGORY_NAME_MAP[id_value] = formatted_name
    CATEGORY_ID_MAP[formatted_name] = id_value

for name, id_value in SUBCATEGORIES.items():
    formatted_name = format_category_name(name)
    CATEGORY_NAME_MAP[id_value] = formatted_name
    CATEGORY_ID_MAP[formatted_name] = id_value