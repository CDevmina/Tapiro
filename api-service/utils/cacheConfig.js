/**
 * Standard cache TTL values in seconds
 */
const CACHE_TTL = {
  TOKEN: 3600, // Regular tokens - 1 hour
  ADMIN_TOKEN: 82800, // Management tokens - 23 hours
  USER_DATA: 3600, // User profiles - 1 hour
  STORE_DATA: 3600, // Store profiles - 1 hour
  API_KEY: 1800, // API keys - 30 minutes
  INVALIDATION: 1, // Short TTL for invalidation
  AI_REQUEST: 60, // AI service requests - 1 minute
  TAXONOMY: 3600, // 1 hour
  TAXONOMY_ATTRIBUTES: 3600, // 1 hour
  TAXONOMY_SEARCH: 300, // 5 minutes (shorter TTL for search results)
  TAXONOMY_EMBEDDINGS: 86400, // 1 day (LONG)
  PRICE_RANGES: 3600, // 1 hour (MEDIUM)
  SCHEMA: 3600, // 1 hour
};

/**
 * Cache key prefixes
 */
const CACHE_KEYS = {
  USER_DATA: 'userdata:', // User data from Auth0
  STORE_DATA: 'store:', // Store data from DB
  API_KEY: 'apikey:', // API key to store ID mapping
  SCOPES: 'scopes:', // Token to scopes mapping
  ADMIN_TOKEN: 'auth0_management_token', // Auth0 management token
  PREFERENCES: 'preferences:', // User preferences
  STORE_PREFERENCES: 'prefs:', // Store preferences
  AI_REQUEST: 'ai_request:', // AI service request cache
  TAXONOMY_TREE: 'taxonomy:tree:',
  TAXONOMY_ATTRIBUTES: 'taxonomy:attrs:',
  TAXONOMY_SEARCH: 'taxonomy:search:', // New key for search results
  TAXONOMY_EMBEDDINGS: 'taxonomy:embeddings:',
  PRICE_RANGES: 'taxonomy:prices:',
  SCHEMA_PROPS: 'schema:props:',
};

module.exports = { CACHE_TTL, CACHE_KEYS };
