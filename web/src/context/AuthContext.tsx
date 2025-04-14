import { ReactNode, useState, useEffect, useCallback } from "react";
import { Auth0Provider, useAuth0, AppState } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
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
  } = useAuth0();

  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    // Extract roles from the custom claim in the user object
    // Adjust the claim name if it's different in your Auth0 setup
    const roles = auth0User?.["https://tapiro.com/roles"] || [];
    setUserRoles(roles);
  }, [auth0User]);

  const getAccessToken = useCallback(async (): Promise<string | undefined> => {
    try {
      // Use the audience defined in your .env
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: import.meta.env.VITE_AUTH0_AUDIENCE,
        },
      });
      return token;
    } catch (e) {
      console.error("Error getting access token", e);
      // Handle error, potentially trigger login
      return undefined;
    }
  }, [getAccessTokenSilently]);

  const login = useCallback(async () => {
    await loginWithRedirect();
  }, [loginWithRedirect]);

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
        // Add scopes if needed, e.g., scope: "openid profile email read:users"
      }}
      onRedirectCallback={onRedirectCallback}
      cacheLocation="localstorage" // Persist auth state across refreshes
    >
      <AuthProviderInternal>{children}</AuthProviderInternal>
    </Auth0Provider>
  );
};
