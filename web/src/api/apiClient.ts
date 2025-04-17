import { Users } from "./types/Users";
import { Stores } from "./types/Stores";
import { Health } from "./types/Health";
import { Ping } from "./types/Ping";
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
  };
}

// Hook to get API clients with auth token
export function useApiClients() {
  const { getAccessToken, isAuthenticated, isLoading: authLoading } = useAuth();
  const [isTokenSet, setIsTokenSet] = useState(false);

  // Memoize the API clients so they aren't recreated on each render
  const apiClients = useMemo(() => createApiClients(), []);

  useEffect(() => {
    let isMounted = true;

    if (isAuthenticated && !authLoading) {
      (async () => {
        try {
          const token = await getAccessToken();
          if (isMounted) {
            Object.values(apiClients).forEach((c) =>
              c.setSecurityData(token || null),
            );
            setIsTokenSet(!!token);
          }
        } catch (e) {
          console.error("Failed to set auth token", e);
          if (isMounted) {
            Object.values(apiClients).forEach((c) => c.setSecurityData(null));
            setIsTokenSet(false);
          }
        }
      })();
    } else {
      Object.values(apiClients).forEach((c) => c.setSecurityData(null));
      setIsTokenSet(false);
    }

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, authLoading, getAccessToken, apiClients]);

  return { apiClients, isTokenSet };
}
