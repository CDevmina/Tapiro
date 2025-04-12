import { useAuthFetch } from "../utils/apiUtil";

/**
 * Hook for authentication-related API calls
 */
export function useAuthApi() {
  const { post, put } = useAuthFetch();

  /**
   * Register a new user account
   * @param {Object} userData - User registration data
   * @param {Array} userData.preferences - Optional initial preferences
   * @param {boolean} userData.dataSharingConsent - User's consent for data sharing
   * @returns {Promise<Object>} - Newly created user
   */
  const registerUser = (userData) => {
    return post("/users/register", userData);
  };

  /**
   * Register a new store account
   * @param {Object} storeData - Store registration data
   * @param {string} storeData.name - Store name
   * @param {string} storeData.address - Store address
   * @param {Array} storeData.webhooks - Optional webhook configurations
   * @returns {Promise<Object>} - Newly created store
   */
  const registerStore = (storeData) => {
    return post("/stores/register", storeData);
  };

  /**
   * Update user registration status in Auth0 metadata
   * @param {Object} metadata - Metadata to update
   * @param {string} metadata.registrationType - Type of registration ('user' or 'store')
   * @param {boolean} metadata.registrationComplete - Whether registration is complete
   * @returns {Promise<Object>} - Updated metadata
   */
  const updateAuthMetadata = (metadata) => {
    return put("/users/metadata", metadata);
  };

  /**
   * Get user registration status from Auth0 metadata
   * @returns {Promise<Object>} - User metadata containing registration status
   */
  const getAuthMetadata = () => {
    return post("/users/metadata/get");
  };

  return {
    registerUser,
    registerStore,
    updateAuthMetadata,
    getAuthMetadata,
  };
}
