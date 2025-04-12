import { useAuthFetch } from "../utils/apiUtil";

/**
 * Hook for user profile management API calls
 */
export function useUserApi() {
  const { get, put, delete: deleteRequest } = useAuthFetch();

  /**
   * Get the authenticated user's profile
   * @returns {Promise<Object>} User profile
   */
  const getUserProfile = () => {
    return get("/users/profile");
  };

  /**
   * Update the authenticated user's profile
   * @param {Object} profileData - Updated profile data
   * @returns {Promise<Object>} Updated user profile
   */
  const updateUserProfile = (profileData) => {
    return put("/users/profile", profileData);
  };

  /**
   * Delete the authenticated user's profile
   * @returns {Promise<Object>} Empty response on success
   */
  const deleteUserProfile = () => {
    return deleteRequest("/users/profile");
  };

  return {
    getUserProfile,
    updateUserProfile,
    deleteUserProfile,
  };
}
