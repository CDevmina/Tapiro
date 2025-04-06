from functools import lru_cache
from app.taxonomy.constants import MAIN_CATEGORIES, SUBCATEGORIES
import logging

logger = logging.getLogger(__name__)

@lru_cache(maxsize=1)
def get_category_descriptions():
    """Generate human-readable descriptions for categories in taxonomy"""
    descriptions = {}
    
    # Main categories
    for name, cat_id in MAIN_CATEGORIES.items():
        cleaned_name = name.lower().replace('_', ' ')
        descriptions[str(cat_id)] = cleaned_name
        
    # Subcategories
    for name, cat_id in SUBCATEGORIES.items():
        cleaned_name = name.lower().replace('_', ' ')
        descriptions[str(cat_id)] = cleaned_name
        
    return descriptions

@lru_cache(maxsize=1)
def get_category_embedding_candidates():
    """Generate category descriptions for embedding matching"""
    candidates = []
    descriptions = get_category_descriptions()
    
    for cat_id, description in descriptions.items():
        # Add direct description
        candidates.append((description, cat_id))
        
        # Add variations for subcategories based on common terms
        if cat_id == str(SUBCATEGORIES.get("SMARTPHONES")):
            candidates.extend([
                ("smartphone", cat_id),
                ("mobile phone", cat_id),
                ("cell phone", cat_id),
                ("iphone android phone", cat_id)
            ])
        elif cat_id == str(SUBCATEGORIES.get("COMPUTERS")):
            candidates.extend([
                ("laptop computer", cat_id),
                ("desktop pc", cat_id),
                ("macbook windows computer", cat_id)
            ])
        # Add more variations as needed
    
    return candidates

def build_keyword_category_mapping():
    """Build mapping of keywords to categories based on taxonomy"""
    mapping = {}
    
    # Map common keywords to categories - organized by main category
    category_keywords = {
        # === ELECTRONICS (100) ===
        "SMARTPHONES": ["phone", "smartphone", "mobile", "iphone", "android", "cell", "cellular", 
                        "xiaomi", "oneplus", "huawei", "pixel", "galaxy", "phone case", "screen protector"],
        
        "COMPUTERS": ["laptop", "computer", "desktop", "pc", "mac", "chromebook", "notebook", "macbook",
                      "monitor", "cpu", "processor", "ssd", "hard drive", "ram", "gpu", "keyboard", "mouse"],
        
        "AUDIO": ["headphone", "speaker", "earbud", "airpod", "audio", "sound", "microphone", "earphone",
                 "headset", "bluetooth speaker", "soundbar", "subwoofer", "amplifier", "bose", "sonos", "beats"],
        
        "TVS_DISPLAYS": ["tv", "television", "monitor", "screen", "display", "projector", "smart tv", 
                         "led tv", "oled", "qled", "hdtv", "4k", "8k", "uhd", "roku", "firestick"],
        
        "CAMERAS": ["camera", "dslr", "mirrorless", "webcam", "gopro", "lens", "photography", "video camera", 
                   "camcorder", "canon", "nikon", "sony camera", "security camera", "dash cam"],
        
        "WEARABLES": ["smartwatch", "fitness tracker", "wearable", "apple watch", "fitbit", "garmin", 
                     "band", "smart ring", "smart glasses", "health tracker"],
        
        "GAMING": ["game console", "playstation", "xbox", "nintendo", "switch", "controller", "gaming pc", 
                  "gaming laptop", "game", "gamer", "gaming headset", "gaming chair", "gaming mouse"],
        
        "SMART_HOME": ["smart home", "alexa", "echo", "google home", "smart speaker", "smart light", 
                      "smart thermostat", "nest", "ring doorbell", "smart lock", "automation"],
        
        "TABLETS": ["tablet", "ipad", "kindle", "e-reader", "android tablet", "surface", "galaxy tab",
                   "tablet case", "stylus", "pencil"],
        
        "ACCESSORIES": ["charger", "cable", "adapter", "usb", "hdmi", "power bank", "case", "cover",
                       "screen protector", "stand", "mount", "dongle", "hub"],
        
        # === CLOTHING (200) ===
        "MENS_CLOTHING": ["men", "mens", "man", "male", "guys", "menswear", "men's shirt", "men's pants", 
                         "men's jacket", "men's sweater", "men's hoodie", "men's suit", "men's coat",
                         "menswear", "men's jeans", "men's shorts"],
        
        "WOMENS_CLOTHING": ["women", "womens", "woman", "female", "ladies", "womenswear", "women's dress", 
                           "women's shirt", "women's blouse", "women's top", "women's pants", "women's jeans", 
                           "women's skirt", "women's jacket", "women's coat", "women's sweater"],
        
        "CHILDRENS_CLOTHING": ["kids", "children", "baby", "toddler", "infant", "youth", "boy", "girl",
                              "kids clothes", "children's wear", "baby clothes", "kid's jacket", "school uniform"],
        
        "FOOTWEAR": ["shoe", "sneaker", "boot", "footwear", "sandal", "heel", "flat", "loafer", "oxford",
                    "running shoe", "athletic shoe", "slipper", "flip flop", "tennis shoe", "hiking boot"],
        
        "ACCESSORIES": ["bag", "purse", "wallet", "backpack", "handbag", "tote", "satchel", "belt", "hat",
                       "scarf", "gloves", "jewelry", "watch", "sunglasses", "tie", "socks"],
        
        "ACTIVEWEAR": ["activewear", "athletic", "workout", "gym", "sport", "running", "yoga", "fitness",
                      "leggings", "shorts", "jersey", "dri fit", "compression", "tracksuit", "swimwear"],
        
        # === HOME & GARDEN (300) ===
        "FURNITURE": ["furniture", "sofa", "couch", "chair", "table", "desk", "bed", "mattress", "dresser",
                     "bookcase", "shelf", "cabinet", "nightstand", "ottoman", "recliner", "sectional", "bench"],
        
        "KITCHEN": ["kitchen", "cookware", "utensil", "appliance", "dish", "pot", "pan", "knife", "blender",
                   "mixer", "toaster", "coffee maker", "microwave", "cutting board", "dinnerware", "flatware"],
        
        "HOME_DECOR": ["decor", "decoration", "ornament", "wall art", "vase", "candle", "frame", "mirror",
                      "rug", "carpet", "pillow", "throw", "artwork", "clock", "figurine", "plant"],
        
        "BEDDING_BATH": ["bedding", "sheet", "pillow", "towel", "blanket", "comforter", "duvet", "quilt", 
                        "pillowcase", "mattress pad", "shower curtain", "bath mat", "bathroom accessory"],
        
        "GARDEN": ["garden", "plant", "outdoor", "lawn", "patio", "flower", "tool", "seed", "planter",
                  "pot", "hose", "sprinkler", "soil", "fertilizer", "mower", "trimmer", "rake", "shovel"],
        
        # === BEAUTY & PERSONAL CARE (400) ===
        "SKINCARE": ["skincare", "moisturizer", "cleanser", "serum", "lotion", "cream", "face mask",
                    "sunscreen", "exfoliator", "eye cream", "toner", "acne", "anti-aging"],
        
        "MAKEUP": ["makeup", "cosmetic", "foundation", "concealer", "powder", "blush", "eyeshadow", 
                  "mascara", "eyeliner", "lipstick", "lip gloss", "bronzer", "highlighter", "beauty blender"],
        
        "HAIRCARE": ["hair", "shampoo", "conditioner", "styling", "hair dryer", "straightener", "curling iron", 
                    "hair spray", "mousse", "gel", "brush", "comb", "hair color", "hair mask"],
        
        "FRAGRANCE": ["perfume", "cologne", "fragrance", "scent", "eau de toilette", "eau de parfum", 
                     "body spray", "mist", "essential oil", "diffuser", "candle"],
        
        # === SPORTS & OUTDOORS (500) ===
        "FITNESS": ["fitness", "exercise", "workout", "training", "gym", "weight", "dumbbell", "treadmill", 
                   "elliptical", "yoga mat", "resistance band", "kettlebell", "home gym"],
        
        "OUTDOOR_RECREATION": ["outdoor", "camping", "hiking", "backpack", "tent", "sleeping bag", "fishing",
                              "hunting", "kayak", "canoe", "paddle", "binocular", "compass", "grill"],
        
        "SPORTS_EQUIPMENT": ["sports", "basketball", "football", "soccer", "baseball", "tennis", "golf", 
                            "racquet", "bat", "ball", "glove", "helmet", "protective gear", "team sport"]
    }
    
    # Build the subcategory mappings
    for category_name, keywords in category_keywords.items():
        cat_id = SUBCATEGORIES.get(category_name)
        if cat_id:
            for keyword in keywords:
                mapping[keyword] = str(cat_id)
    
    # Add main category fallback keywords for broader matches
    main_category_keywords = {
        "ELECTRONICS": ["electronics", "tech", "gadget", "device", "electronic", "technology", "digital", 
                       "battery", "wireless", "portable", "smart device", "consumer electronics"],
        
        "CLOTHING": ["clothing", "apparel", "fashion", "wear", "clothes", "outfit", "garment", "wardrobe",
                    "attire", "dress", "collection", "style", "designer", "fabric", "textile"],
        
        "HOME_GARDEN": ["home", "house", "garden", "interior", "domestic", "household", "living", "residence",
                       "decor", "indoor", "housewares", "furnishing", "homewares", "patio"],
        
        "BEAUTY_PERSONAL_CARE": ["beauty", "personal care", "cosmetic", "grooming", "skincare", "hygiene",
                                "self-care", "toiletry", "bath", "shower", "salon"],
        
        "SPORTS_OUTDOORS": ["sport", "outdoor", "athletic", "recreation", "activity", "exercise", "fitness",
                           "adventure", "leisure", "equipment", "gear", "hobby"],
        
        "BOOKS_MEDIA": ["book", "ebook", "reading", "magazine", "media", "literature", "novel", "textbook",
                       "comic", "publication", "audiobook", "journal", "biography", "fiction", "non-fiction"],
        
        "FOOD_GROCERY": ["food", "grocery", "snack", "beverage", "drink", "edible", "ingredient", "meal",
                        "cooking", "kitchen", "pantry", "gourmet", "organic", "natural", "fresh"],
        
        "AUTOMOTIVE": ["car", "auto", "vehicle", "automotive", "truck", "motorcycle", "part", "accessory",
                      "maintenance", "repair", "motor", "engine", "tire", "oil", "battery"],
        
        "HEALTH_WELLNESS": ["health", "wellness", "medical", "supplement", "vitamin", "nutrition", "remedy",
                          "medicine", "healthcare", "diet", "herbal", "mineral", "natural remedy"],
        
        "TOYS_GAMES": ["toy", "game", "play", "puzzle", "entertainment", "board game", "card game",
                      "educational toy", "action figure", "doll", "construction toy", "outdoor toy"]
    }
    
    # Add main category mappings (don't override subcategory mappings)
    for category_name, keywords in main_category_keywords.items():
        cat_id = MAIN_CATEGORIES.get(category_name)
        if cat_id:
            for keyword in keywords:
                if keyword not in mapping:  # Don't override more specific mappings
                    mapping[keyword] = str(cat_id)
    
    return mapping