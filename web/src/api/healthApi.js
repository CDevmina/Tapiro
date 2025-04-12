// Note: Health endpoints don't require authentication

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Health check API calls
 */
export const healthApi = {
  /**
   * Perform a comprehensive health check
   * @returns {Promise<Object>} Health status information
   */
  healthCheck: async () => {
    const response = await fetch(`${API_URL}/health`);
    if (!response.ok) {
      throw new Error("Health check failed");
    }
    return response.json();
  },

  /**
   * Simple ping endpoint for uptime monitoring
   * @returns {Promise<Object>} Simple response indicating the API is up
   */
  ping: async () => {
    const response = await fetch(`${API_URL}/ping`);
    if (!response.ok) {
      throw new Error("Ping failed");
    }
    return response.json();
  },
};
