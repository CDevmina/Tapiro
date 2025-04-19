import { ReactNode, useState, useEffect, useCallback } from "react";
import { Auth0Provider, useAuth0, AppState } from "@auth0/auth0-react";
import { useNavigate } from "react-router";
import ErrorDisplay from "../components/common/ErrorDisplay";
import { AuthContext } from "./AuthContextType";

// Internal provider component using useAuth0
const AuthProviderInternal = ({ children }: { children: ReactNode }) => {
  const {
    isLoading: auth0IsLoading,
    isAuthenticated: auth0IsAuthenticated,
    user: auth0User,
    getAccessTokenSilently,
    loginWithRedirect,
    logout: auth0Logout,
    getIdTokenClaims,
  } = useAuth0();

  const [userRoles, setUserRoles] = useState<string[]>([]);
  const [tokenError, setTokenError] = useState<Error | null>(null);

  // --- Refactored Role Loading ---
  const fetchAndSetRoles = useCallback(async () => {
    if (auth0IsAuthenticated) {
      try {
        // Fetch fresh claims
        console.log("Fetching ID token claims for roles..."); // Debug log
        const claims = await getIdTokenClaims(); // Use default cache initially, refreshTokens will bypass
        const roles = claims?.["https://tapiro.com/roles"] || [];
        setUserRoles(roles);
        console.log("User roles updated:", roles); // Debug log
      } catch (e) {
        console.error("Error loading ID token claims for roles", e);
        // Don't set tokenError here, it's for access tokens
        // Keep existing roles or clear them? Clearing might be safer.
        setUserRoles([]);
      }
    } else {
      setUserRoles([]); // Clear roles if not authenticated
    }
  }, [auth0IsAuthenticated, getIdTokenClaims]); // Dependencies for the role fetching logic

  // Effect to load roles initially or on auth change
  useEffect(() => {
    fetchAndSetRoles(); // Call the refactored function
  }, [fetchAndSetRoles]); // Depend on the stable callback

  // Original getAccessToken (uses cache by default)
  const getAccessToken = useCallback(async (): Promise<string> => {
    // ... (no changes needed here) ...
    setTokenError(null);
    try {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        },
        // Default cache mode is 'on'
      });
      if (!token) {
        throw new Error("Received empty token from Auth0.");
      }
      return token;
    } catch (e) {
      console.error("Error getting access token", e);
      const error =
        e instanceof Error ? e : new Error("Failed to get access token");
      setTokenError(error);
      throw error;
    }
  }, [getAccessTokenSilently]);

  // New function to force refresh
  const refreshTokens = useCallback(async (): Promise<void> => {
    setTokenError(null);
    console.log("Attempting to refresh tokens by bypassing cache...");
    try {
      const tokenResponse = await getAccessTokenSilently({
        // Renamed variable
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        },
        cacheMode: "off", // <-- Force bypass cache
        detailedResponse: true,
      });

      if (!tokenResponse || !tokenResponse.access_token) {
        throw new Error("Received empty token from Auth0 during refresh.");
      }

      console.log("Tokens refreshed successfully via SDK.");

      // --- Explicitly update roles AFTER successful token refresh ---
      await fetchAndSetRoles(); // <-- Call the role fetching logic immediately
    } catch (e) {
      console.error("Error refreshing tokens", e);
      const error =
        e instanceof Error ? e : new Error("Failed to refresh tokens");
      setTokenError(error);
    }
  }, [getAccessTokenSilently, fetchAndSetRoles]); // <-- Add fetchAndSetRoles dependency

  const login = useCallback(
    // ... (no changes needed here) ...
    async (options = {}) => {
      await loginWithRedirect({
        ...options,
      });
    },
    [loginWithRedirect],
  );

  const logout = useCallback(async () => {
    // ... (no changes needed here) ...
    await auth0Logout({
      logoutParams: { returnTo: window.location.origin },
    });
  }, [auth0Logout]);

  const value = {
    isLoading: auth0IsLoading,
    isAuthenticated: auth0IsAuthenticated,
    user: auth0User,
    userRoles,
    getAccessToken,
    login,
    logout,
    tokenError,
    refreshTokens,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// ... AuthProviderWrapper remains the same ...
export const AuthProviderWrapper = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();

  const onRedirectCallback = (appState?: AppState) => {
    navigate(appState?.returnTo || window.location.pathname);
  };

  // Ensure environment variables are loaded
  const domain = import.meta.env.VITE_AUTH0_DOMAIN;
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE;

  if (!domain || !clientId || !audience) {
    // Use the ErrorDisplay component for configuration errors
    return (
      <ErrorDisplay
        title="Configuration Error"
        message="Auth0 environment variables (VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, VITE_AUTH0_AUDIENCE) are not configured correctly. Please check your .env file and ensure the application is restarted."
      />
    );
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience: audience, // Request audience for API access
        scope: "openid profile email offline_access", // <-- Add offline_access if using refresh token rotation
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage" // Persist auth state across refreshes
      useRefreshTokens={true} // <-- Explicitly enable refresh tokens
      useRefreshTokensFallback={true} // <-- Use silent auth if refresh token fails
    >
      <AuthProviderInternal>{children}</AuthProviderInternal>
    </Auth0Provider>
  );
};
