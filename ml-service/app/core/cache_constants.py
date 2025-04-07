"""Cache duration constants"""

# Cache durations in seconds
CACHE_DURATIONS = {
    "SHORT": 300,           # 5 minutes
    "MEDIUM": 3600,         # 1 hour
    "LONG": 86400,          # 1 day
    "VERY_LONG": 604800     # 1 week
}

# Specific cache durations for different types of data
TAXONOMY_TREE_TTL = CACHE_DURATIONS["MEDIUM"]       # Tree structure changes infrequently
TAXONOMY_ATTRS_TTL = CACHE_DURATIONS["MEDIUM"]      # Attributes change infrequently  
TAXONOMY_SEARCH_TTL = CACHE_DURATIONS["SHORT"]      # Search results can change more often
TAXONOMY_EMBEDDINGS_TTL = CACHE_DURATIONS["LONG"]   # Embeddings change very rarely
PRICE_RANGES_TTL = CACHE_DURATIONS["MEDIUM"]        # Price ranges change infrequently
TAXONOMY_SCHEMA_TTL = CACHE_DURATIONS["MEDIUM"]     # MongoDB schemas change infrequently