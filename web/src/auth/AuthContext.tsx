import { ReactNode, useEffect } from "react";
import {
  Auth0Provider,
  Auth0ProviderOptions,
  useAuth0,
} from "@auth0/auth0-react";
import { AUTH_CONFIG } from "./AuthConfig";
import { tokenManager } from "./TokenManager";

interface AuthProviderProps {
  children: ReactNode;
}

// This component must be wrapped by Auth0Provider to use the useAuth0 hook
const AuthSetup = ({ children }: { children: ReactNode }) => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  useEffect(() => {
    // Only attempt to get token if user is authenticated
    if (!getAccessTokenSilently || !isAuthenticated) return;

    const setupAuth0Client = async () => {
      try {
        // Direct approach without using internal methods
        const token = await getAccessTokenSilently({
          detailedResponse: false,
          authorizationParams: {
            // Explicitly request these scopes to ensure we get a refresh token
            scope: AUTH_CONFIG.scope,
          },
        });
        tokenManager.setToken(token);

        // Log success but not the actual token
        console.debug("Successfully initialized token manager");
      } catch (err) {
        console.error("Failed to initialize token manager:", err);
      }
    };

    setupAuth0Client();
  }, [getAccessTokenSilently, isAuthenticated]);

  return <>{children}</>;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  // Ensure all required fields have values
  if (!AUTH_CONFIG.domain || !AUTH_CONFIG.clientId) {
    console.error("Missing Auth0 configuration:", AUTH_CONFIG);
    return (
      <div>Authentication configuration error. Check console for details.</div>
    );
  }

  const config: Auth0ProviderOptions = {
    domain: AUTH_CONFIG.domain,
    clientId: AUTH_CONFIG.clientId,
    authorizationParams: {
      redirect_uri: AUTH_CONFIG.redirectUri,
      audience: AUTH_CONFIG.audience,
      scope: AUTH_CONFIG.scope,
    },
    useRefreshTokens: true,
    cacheLocation: "localstorage",
    useCookiesForTransactions: true,
  };

  return (
    <Auth0Provider {...config}>
      <AuthSetup>{children}</AuthSetup>
    </Auth0Provider>
  );
};
