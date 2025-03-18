/**
 * Standard cache TTL values in seconds
 */
const CACHE_TTL = {
  TOKEN: 3600,        // Regular tokens - 1 hour
  ADMIN_TOKEN: 82800, // Management tokens - 23 hours
  USER_DATA: 3600,    // User profiles - 1 hour
  STORE_DATA: 3600,    // Store profiles - 1 hour
  INVALIDATION: 1,   // Short TTL for invalidation
};

/**
 * Cache key prefixes
 */
const CACHE_KEYS = {
  USER_DATA: 'userdata:',     // User data from Auth0
  STORE_DATA: 'store:',       // Store data from DB
  API_KEY: 'apikey:',         // API key to store ID mapping
  SCOPES: 'scopes:',          // Token to scopes mapping
  ADMIN_TOKEN: 'auth0_management_token', // Auth0 management token
  PREFERENCES: 'preferences:', // User preferences
  STORE_PREFERENCES: 'prefs:', // Store preferences
};

module.exports = { CACHE_TTL, CACHE_KEYS };