import { useAuthFetch } from "../utils/apiUtil";

/**
 * Hook for store profile and API key management
 */
export function useStoreApi() {
  const { get, post, put, delete: deleteRequest } = useAuthFetch();

  // Store Profile Methods
  /**
   * Get the authenticated store's profile
   * @returns {Promise<Object>} Store profile
   */
  const getStoreProfile = () => {
    return get("/stores/profile");
  };

  /**
   * Update the authenticated store's profile
   * @param {Object} profileData - Updated profile data
   * @returns {Promise<Object>} Updated store profile
   */
  const updateStoreProfile = (profileData) => {
    return put("/stores/profile", profileData);
  };

  /**
   * Delete the authenticated store's profile
   * @returns {Promise<Object>} Empty response on success
   */
  const deleteStoreProfile = () => {
    return deleteRequest("/stores/profile");
  };

  // API Key Methods
  /**
   * Create a new API key for the store
   * @param {Object} options - API key options
   * @param {string} options.name - Optional name for the API key
   * @returns {Promise<Object>} Newly created API key
   */
  const createApiKey = (options = {}) => {
    return post("/stores/api-keys", options);
  };

  /**
   * Get all API keys for the store
   * @returns {Promise<Array>} List of API keys
   */
  const getApiKeys = () => {
    return get("/stores/api-keys");
  };

  /**
   * Revoke an API key
   * @param {string} keyId - ID of the API key to revoke
   * @returns {Promise<Object>} Empty response on success
   */
  const revokeApiKey = (keyId) => {
    return deleteRequest(`/stores/api-keys/${keyId}`);
  };

  /**
   * Get usage statistics for a specific API key
   * @param {string} keyId - ID of the API key
   * @param {Object} dateRange - Optional date range for filtering
   * @param {string} dateRange.startDate - Start date in ISO format
   * @param {string} dateRange.endDate - End date in ISO format
   * @returns {Promise<Object>} API key usage statistics
   */
  const getApiKeyUsage = (keyId, dateRange = {}) => {
    return post(`/stores/api-keys/${keyId}/usage`, dateRange);
  };

  return {
    getStoreProfile,
    updateStoreProfile,
    deleteStoreProfile,
    createApiKey,
    getApiKeys,
    revokeApiKey,
    getApiKeyUsage,
  };
}
