import { Users } from "./types/Users";
import { Stores } from "./types/Stores";
import { Health } from "./types/Health";
import { Ping } from "./types/Ping";
import { Taxonomy } from "./types/Taxonomy"; // <-- Import Taxonomy client class
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/useAuth"; // ← use your context
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
    taxonomy: new Taxonomy(config), // <-- Add Taxonomy client instance
  };
}

// Hook to get API clients with auth token
export function useApiClients() {
  const { getAccessToken, isAuthenticated, isLoading: authLoading } = useAuth();
  // Add state to track if clients are ready with a token
  const [clientsReady, setClientsReady] = useState(false);

  // Memoize the API clients so they aren't recreated on each render
  const apiClients = useMemo(() => createApiClients(), []);

  useEffect(() => {
    let isMounted = true;

    if (isAuthenticated && !authLoading) {
      (async () => {
        try {
          const token = await getAccessToken(); // This now throws on error
          if (isMounted) {
            Object.values(apiClients).forEach(
              (c) => c.setSecurityData(token || null), // Should always have token here if no error
            );
            setClientsReady(true); // <-- Set clients as ready AFTER token is set
          }
        } catch {
          // <-- Remove 'e' from here
          // Error fetching token (already logged in getAccessToken)
          if (isMounted) {
            Object.values(apiClients).forEach((c) => c.setSecurityData(null));
            setClientsReady(false); // <-- Clients are not ready
          }
        }
      })();
    } else {
      // If not authenticated or still loading, ensure clients are not ready and have no token
      Object.values(apiClients).forEach((c) => c.setSecurityData(null));
      setClientsReady(false); // <-- Clients are not ready
    }

    return () => {
      isMounted = false;
    };
    // Add clientsReady to dependency array? No, causes infinite loop.
    // The effect should run based on auth state changes.
  }, [isAuthenticated, authLoading, getAccessToken, apiClients]);

  // Return clients and the readiness state
  return { apiClients, clientsReady };
}
