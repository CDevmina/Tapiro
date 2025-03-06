import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { AuthContext } from "./AuthContext";

export function AuthProvider({ children }) {
  const {
    isAuthenticated,
    isLoading: auth0Loading,
    user,
    loginWithRedirect,
    logout: auth0Logout,
    getAccessTokenSilently,
  } = useAuth0();

  const [token, setToken] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  // Get token when authenticated
  useEffect(() => {
    const getToken = async () => {
      if (!isAuthenticated || !user) {
        setAuthReady(true);
        return;
      }

      try {
        setTokenLoading(true);
        // Get access token
        const accessToken = await getAccessTokenSilently();
        setToken(accessToken);
      } catch (error) {
        console.error("Failed to get access token", error);
      } finally {
        setTokenLoading(false);
        setAuthReady(true);
      }
    };

    getToken();
  }, [isAuthenticated, user, getAccessTokenSilently]);

  // Auth functions with useCallback
  const login = useCallback(() => {
    return loginWithRedirect();
  }, [loginWithRedirect]);

  const logout = useCallback(() => {
    return auth0Logout({
      logoutParams: { returnTo: window.location.origin },
    });
  }, [auth0Logout]);

  // Extract roles directly from user object when needed
  const getRoles = useCallback(() => {
    return user?.["https://tapiro.com/roles"] || [];
  }, [user]);

  // Role checking utilities
  const hasRole = useCallback(
    (requiredRole) => {
      const roles = getRoles();
      return roles.includes(requiredRole);
    },
    [getRoles]
  );

  const hasAnyRole = useCallback(
    (requiredRoles = []) => {
      const roles = getRoles();
      return requiredRoles.some((role) => roles.includes(role));
    },
    [getRoles]
  );

  // Overall loading state
  const isLoading = auth0Loading || tokenLoading || !authReady;

  // Memoize context value
  const value = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      user,
      login,
      logout,
      token,
      roles: getRoles(), // Always get fresh roles directly from token
      hasRole,
      hasAnyRole,
    }),
    [
      isAuthenticated,
      isLoading,
      user,
      login,
      logout,
      token,
      getRoles,
      hasRole,
      hasAnyRole,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
