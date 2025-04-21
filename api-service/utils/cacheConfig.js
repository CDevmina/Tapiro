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
  TAXONOMY: 86400, // 24 hours
  USER_ACTIVITY: 3600, // 1 hour (example)
  USER_ANALYTICS: 7200, // 2 hours (example for spending analytics) // <-- New TTL
};

/**
 * Cache key prefixes
 */
const CACHE_KEYS = {
  USER_DATA: 'user:', // User data from Auth0
  STORE_DATA: 'store:', // Store data from DB
  API_KEY: 'apikey:', // API key to store ID mapping
  SCOPES: 'scopes:', // Token to scopes mapping
  ADMIN_TOKEN: 'auth0_management_token', // Auth0 management token
  PREFERENCES: 'prefs:', // User preferences
  STORE_PREFERENCES: 'store_prefs:', // Store preferences
  AI_REQUEST: 'ai_request:', // AI service request cache
  TAXONOMY_FULL: 'taxonomy:full',
  USER_ACTIVITY_SUMMARY: 'user_activity_summary:', // <-- New Key
  USER_SPENDING_ANALYTICS: 'user_spending_analytics:', // <-- New Key
};

module.exports = { CACHE_TTL, CACHE_KEYS };
