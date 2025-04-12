import { useAuthFetch } from "../utils/apiUtil";

/**
 * Hook for authentication-related API calls
 */
export function useAuthApi() {
  const { post } = useAuthFetch();

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

  return {
    registerUser,
    registerStore,
  };
}
