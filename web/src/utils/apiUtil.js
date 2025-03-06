import { useAuth } from "../hooks/useAuth";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Create a hook for using authenticated API calls
export function useAuthFetch() {
  const { getAccessTokenSilently, isAuthenticated, logout } = useAuth();

  const fetchWithAuth = async (endpoint, options = {}) => {
    if (!isAuthenticated) {
      throw new Error("User not authenticated");
    }

    try {
      const accessToken = await getAccessTokenSilently();

      const headers = {
        ...options.headers,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      };

      // Make the API call
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
      });

      // Handle HTTP errors, including auth errors
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Handle authentication errors
          logout();
          throw new Error("Session expired. Please login again.");
        }

        const errorData = await response.json().catch(() => ({
          message: `API error ${response.status}: ${response.statusText}`,
        }));

        throw new Error(errorData.message || "API request failed");
      }

      // Return JSON response or empty object if no content
      return response.status === 204 ? {} : await response.json();
    } catch (error) {
      console.error("API request failed:", error);
      throw error;
    }
  };

  // Return convenient methods
  return {
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
}
