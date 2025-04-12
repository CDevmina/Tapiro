import { useAuthFetch } from "../utils/apiUtil";

/**
 * Hook for user preferences management
 */
export function usePreferencesApi() {
  const { get, post, put } = useAuthFetch();

  /**
   * Get the authenticated user's preferences
   * @returns {Promise<Object>} User preferences
   */
  const getUserPreferences = () => {
    return get("/users/preferences");
  };

  /**
   * Update the authenticated user's preferences
   * @param {Object} preferences - Updated preference data
   * @param {Array} preferences.preferences - Array of preference items
   * @returns {Promise<Object>} Updated user preferences
   */
  const updateUserPreferences = (preferences) => {
    return put("/users/preferences", preferences);
  };

  /**
   * Opt in to store data collection
   * @param {string} storeId - ID of the store to opt in to
   * @returns {Promise<Object>} Empty response on success
   */
  const optInToStore = (storeId) => {
    return post(`/users/preferences/opt-in/${storeId}`);
  };

  /**
   * Opt out from store data collection
   * @param {string} storeId - ID of the store to opt out from
   * @returns {Promise<Object>} Empty response on success
   */
  const optOutFromStore = (storeId) => {
    return post(`/users/preferences/opt-out/${storeId}`);
  };

  return {
    getUserPreferences,
    updateUserPreferences,
    optInToStore,
    optOutFromStore,
  };
}
