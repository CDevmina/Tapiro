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

  const [authReady, setAuthReady] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Simplified initialization
  useEffect(() => {
    const prepareAuth = async () => {
      try {
        if (isAuthenticated && user) {
          await getAccessTokenSilently();
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setIsInitializing(false);
        setAuthReady(true);
      }
    };

    prepareAuth();
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
  const isLoading = auth0Loading || isInitializing || !authReady;

  // Memoize context value
  const value = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      user,
      login,
      logout,
      getAccessTokenSilently,
      roles: getRoles(),
      hasRole,
      hasAnyRole,
    }),
    [
      isAuthenticated,
      isLoading,
      user,
      login,
      logout,
      getAccessTokenSilently,
      getRoles,
      hasRole,
      hasAnyRole,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
