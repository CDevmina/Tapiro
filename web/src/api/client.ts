import axios, { AxiosError, AxiosInstance } from "axios";
import { Fetcher } from "openapi-typescript-fetch";
import { paths } from "./types";

// Base API URL with fallback
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

// Create base Axios instance with common configuration
export const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Create a typed fetcher instance
export const fetcher = Fetcher.for<paths>();

// Configure the fetcher with our base URL
fetcher.configure({
  baseUrl: API_URL,
});

// Response interceptor for error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response) {
      switch (error.response.status) {
        case 401:
          console.error("Unauthorized: Please login again");
          break;
        case 403:
          console.error("Forbidden: Insufficient permissions");
          break;
        case 404:
          console.error("Not found: The requested resource does not exist");
          break;
        case 500:
          console.error("Server error: Something went wrong on the server");
          break;
        default:
          console.error(`Request failed with status: ${error.response.status}`);
      }
    } else if (error.request) {
      console.error("Network error: No response received from server");
    } else {
      console.error("Request error:", error.message);
    }
    return Promise.reject(error);
  },
);

// Define API endpoints organized by resource type
export const api = {
  // Auth endpoints
  auth: {
    registerUser: fetcher.path("/users/register").method("post").create(),
    registerStore: fetcher.path("/stores/register").method("post").create(),
    updateUserMetadata: fetcher.path("/users/metadata").method("put").create(),
    getUserMetadata: fetcher
      .path("/users/metadata/get")
      .method("post")
      .create(),
  },

  // User endpoints
  users: {
    getProfile: fetcher.path("/users/profile").method("get").create(),
    updateProfile: fetcher.path("/users/profile").method("put").create(),
    deleteProfile: fetcher.path("/users/profile").method("delete").create(),

    // Preference management
    getPreferences: fetcher.path("/users/preferences").method("get").create(),
    updatePreferences: fetcher
      .path("/users/preferences")
      .method("put")
      .create(),
    optInToStore: fetcher
      .path("/users/preferences/opt-in/{storeId}")
      .method("post")
      .create(),
    optOutFromStore: fetcher
      .path("/users/preferences/opt-out/{storeId}")
      .method("post")
      .create(),
  },

  // Store endpoints
  stores: {
    getProfile: fetcher.path("/stores/profile").method("get").create(),
    updateProfile: fetcher.path("/stores/profile").method("put").create(),
    deleteProfile: fetcher.path("/stores/profile").method("delete").create(),

    // API key management
    getApiKeys: fetcher.path("/stores/api-keys").method("get").create(),
    createApiKey: fetcher.path("/stores/api-keys").method("post").create(),
    revokeApiKey: fetcher
      .path("/stores/api-keys/{keyId}")
      .method("delete")
      .create(),
    getApiKeyUsage: fetcher
      .path("/stores/api-keys/{keyId}/usage")
      .method("post")
      .create(),

    // Data operations
    submitUserData: fetcher.path("/users/data").method("post").create(),
    getUserPreferences: fetcher
      .path("/users/{userId}/preferences")
      .method("get")
      .create(),
  },

  // System endpoints
  system: {
    healthCheck: fetcher.path("/health").method("get").create(),
    ping: fetcher.path("/ping").method("get").create(),
  },
};

// Helper to set auth token for API calls
export const setAuthToken = (token: string) => {
  axiosInstance.defaults.headers.common.Authorization = `Bearer ${token}`;

  // Update fetcher's headers for all future requests
  fetcher.configure({
    baseUrl: API_URL,
    init: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });
};

// For store API key authenticated requests
export function getApiKeyClient(apiKey: string): AxiosInstance {
  return axios.create({
    baseURL: API_URL,
    timeout: 10000,
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    },
  });
}
