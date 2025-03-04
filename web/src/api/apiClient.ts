import axios from "axios";
import { tokenManager } from "../auth/TokenManager";

const apiClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

// Add auth interceptor using TokenManager
apiClient.interceptors.request.use(async (config) => {
  try {
    // Only add token for authenticated routes
    if (!config.url?.includes("/public/")) {
      const token = await tokenManager.getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  } catch (error) {
    console.error("Token retrieval failed:", error);
    return Promise.reject(error);
  }
});

// Add response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized errors - token may have expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Clear existing token
        tokenManager.clearToken();

        // Get a fresh token
        const token = await tokenManager.getToken();

        // Update the header and retry
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error("Token refresh failed:", refreshError);

        // If the refresh fails, redirect to login
        window.location.href = "/";
        return Promise.reject(refreshError);
      }
    }

    // Handle CORS errors
    if (error.response?.status === 403) {
      console.error("CORS error:", error.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
