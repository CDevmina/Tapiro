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
  const [tokenError, setTokenError] = useState<Error | null>(null); // <-- Add error state

  // Replace your old useEffect with this:
  useEffect(() => {
    const loadRoles = async () => {
      if (auth0IsAuthenticated) {
        try {
          const claims = await getIdTokenClaims();
          const roles = claims?.["https://tapiro.com/roles"] || [];
          setUserRoles(roles);
        } catch (e) {
          console.error("Error loading ID token claims", e);
        }
      }
    };
    loadRoles();
  }, [auth0IsAuthenticated, getIdTokenClaims]);

  // Update getAccessToken
  const getAccessToken = useCallback(async (): Promise<string> => {
    // <-- Update return type
    setTokenError(null); // <-- Clear previous error on new attempt
    try {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        },
      });
      // Add check in case token is unexpectedly undefined/empty
      if (!token) {
        throw new Error("Received empty token from Auth0.");
      }
      return token;
    } catch (e) {
      console.error("Error getting access token", e);
      // Set the error state
      setTokenError(
        e instanceof Error ? e : new Error("Failed to get access token"),
      );
      // Re-throw the error so callers know it failed
      throw e; // <-- Re-throw error
    }
  }, [getAccessTokenSilently]);

  const login = useCallback(
    async (options = {}) => {
      await loginWithRedirect({
        ...options,
      });
    },
    [loginWithRedirect],
  );

  const logout = useCallback(async () => {
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
    tokenError, // <-- Expose error state
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

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
        scope: "openid profile email", // Ensure we get profile info
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage" // Persist auth state across refreshes
    >
      <AuthProviderInternal>{children}</AuthProviderInternal>
    </Auth0Provider>
  );
};
