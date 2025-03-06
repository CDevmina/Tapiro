import { getAccessTokenSilently } from "@auth0/auth0-react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

/**
 * Make authenticated API requests
 * @param {string} endpoint - API endpoint path
 * @param {Object} options - Fetch options
 * @returns {Promise<any>} API response
 */
export async function fetchWithAuth(endpoint, options = {}) {
  try {
    // Get access token
    const token = await getAccessTokenSilently();

    // Prepare headers with authentication
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // Make the API call
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle HTTP errors
    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `API error ${response.status}: ${response.statusText}`,
      }));

      throw new Error(error.message || "API request failed");
    }

    // Return JSON response or empty object if no content
    return response.status === 204 ? {} : await response.json();
  } catch (error) {
    console.error("API request failed:", error);
    throw error;
  }
}

// Common API methods
export const api = {
  get: (endpoint) => fetchWithAuth(endpoint),

  post: (endpoint, data) =>
    fetchWithAuth(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  put: (endpoint, data) =>
    fetchWithAuth(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (endpoint) =>
    fetchWithAuth(endpoint, {
      method: "DELETE",
    }),
};
