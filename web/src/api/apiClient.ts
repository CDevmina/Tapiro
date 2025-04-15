import { Users } from "./types/Users";
import { Stores } from "./types/Stores";
import { Health } from "./types/Health";
import { Ping } from "./types/Ping";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useMemo } from "react"; // Add useMemo import

export function createApiClients() {
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

  // Common configuration
  const config = {
    baseURL: baseUrl,
    withCredentials: true,
  };

  // Create instances
  return {
    users: new Users(config),
    stores: new Stores(config),
    health: new Health(config),
    ping: new Ping(config),
  };
}

// Hook to get API clients with auth token
export function useApiClients() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  // Memoize the API clients so they aren't recreated on each render
  const apiClients = useMemo(() => createApiClients(), []);

  // Set auth token when available
  useEffect(() => {
    if (isAuthenticated) {
      const setAuthToken = async () => {
        try {
          const token = await getAccessTokenSilently();

          // Set token for each client
          Object.values(apiClients).forEach((client) => {
            client.setSecurityData(token);
          });
        } catch (error) {
          console.error("Failed to get auth token", error);
        }
      };

      setAuthToken();
    }
  }, [isAuthenticated, getAccessTokenSilently, apiClients]);

  return apiClients;
}
