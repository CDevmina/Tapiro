import { useAuth } from "../hooks/useAuth";
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

// Create a hook for using authenticated API calls
export function useAuthFetch() {
  const { getAccessTokenSilently, isAuthenticated, logout } = useAuth();

  const fetchWithAuth = async (endpoint, options = {}) => {
    if (!isAuthenticated) {
      throw new Error("User not authenticated");
    }

    try {
      const accessToken = await getAccessTokenSilently();

      const config = {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      };

      // Make the API call with axios
      const response = await axios(`${API_URL}${endpoint}`, config);

      // Axios automatically returns the data and handles JSON parsing
      return response.data;
    } catch (error) {
      // Handle HTTP errors, including auth errors
      if (error.response) {
        if (error.response.status === 401 || error.response.status === 403) {
          logout();
          throw new Error("Session expired. Please login again.");
        }

        throw new Error(
          error.response.data.message || `API error ${error.response.status}`
        );
      } else if (error.request) {
        // The request was made but no response was received
        console.error("API request failed with no response:", error.request);
        throw new Error(
          "No response from server. Please check your connection."
        );
      } else {
        // Something happened in setting up the request
        console.error("API request setup failed:", error.message);
        throw error;
      }
    }
  };

  // Return convenient methods
  return {
    get: (endpoint) => fetchWithAuth(endpoint, { method: "GET" }),
    post: (endpoint, data) =>
      fetchWithAuth(endpoint, {
        method: "POST",
        data, // Axios uses 'data' instead of 'body'
      }),
    put: (endpoint, data) =>
      fetchWithAuth(endpoint, {
        method: "PUT",
        data,
      }),
    delete: (endpoint) =>
      fetchWithAuth(endpoint, {
        method: "DELETE",
      }),
  };
}
