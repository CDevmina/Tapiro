import { Users } from "./types/Users";
import { Stores } from "./types/Stores";
import { Health } from "./types/Health";
import { Ping } from "./types/Ping";
import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useMemo, useState } from "react"; // Import useState
import { ApiConfig } from "./types/http-client"; // Import ApiConfig

export function createApiClients() {
  const baseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

  // Common configuration including the security worker
  const config: ApiConfig<string> = {
    // Use ApiConfig and specify token type (string)
    baseURL: baseUrl,
    withCredentials: true,
    // Add the security worker to apply the token
    securityWorker: (securityData) => {
      if (securityData) {
        return {
          headers: {
            Authorization: `Bearer ${securityData}`,
          },
        };
      }
    },
  };

  // Create instances with the shared config
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
  const [isTokenSet, setIsTokenSet] = useState(false); // State to track token readiness

  // Memoize the API clients so they aren't recreated on each render
  const apiClients = useMemo(() => createApiClients(), []);

  // Set auth token when available
  useEffect(() => {
    let isMounted = true; // Prevent state update on unmounted component

    if (isAuthenticated) {
      const setAuthToken = async () => {
        try {
          const token = await getAccessTokenSilently();
          if (isMounted) {
            // Set token for each client
            Object.values(apiClients).forEach((client) => {
              client.setSecurityData(token);
            });
            setIsTokenSet(true); // Signal that token is ready
          }
        } catch (error) {
          console.error("Failed to get auth token", error);
          if (isMounted) {
            // Clear security data if token fetch fails
            Object.values(apiClients).forEach((client) => {
              client.setSecurityData(null);
            });
            setIsTokenSet(false); // Signal token is not ready
          }
        }
      };

      setAuthToken();
    } else {
      // Clear security data if not authenticated
      Object.values(apiClients).forEach((client) => {
        client.setSecurityData(null);
      });
      setIsTokenSet(false); // Signal token is not ready
    }

    return () => {
      isMounted = false; // Cleanup function
    };
  }, [isAuthenticated, getAccessTokenSilently, apiClients]); // Keep dependencies

  // Return clients and the readiness state
  return { apiClients, isTokenSet };
}
