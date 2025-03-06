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
  const [roles, setRoles] = useState([]);
  const [authReady, setAuthReady] = useState(false);

  // On mount, try to load persisted roles from localStorage
  useEffect(() => {
    const persistedRoles = localStorage.getItem("auth_roles");
    if (persistedRoles) {
      try {
        setRoles(JSON.parse(persistedRoles));
      } catch (error) {
        console.error("Failed to parse persisted roles", error);
        localStorage.removeItem("auth_roles");
      }
    }
  }, []);

  // Get token and extract roles when authenticated
  useEffect(() => {
    const getTokenAndRoles = async () => {
      if (!isAuthenticated || !user) {
        setAuthReady(true);
        return;
      }

      try {
        setTokenLoading(true);
        // Get access token
        const accessToken = await getAccessTokenSilently();
        setToken(accessToken);

        // Extract roles from user data
        const userRoles = user?.["https://tapiro.com/roles"] || [];

        // Persist roles for faster loading next time
        localStorage.setItem("auth_roles", JSON.stringify(userRoles));
        setRoles(userRoles);
      } catch (error) {
        console.error("Failed to get access token", error);
      } finally {
        setTokenLoading(false);
        setAuthReady(true);
      }
    };

    getTokenAndRoles();
  }, [isAuthenticated, user, getAccessTokenSilently]);

  // Memoize functions with useCallback
  const login = useCallback(() => {
    return loginWithRedirect();
  }, [loginWithRedirect]);

  const logout = useCallback(() => {
    // Clear persisted data
    localStorage.removeItem("auth_roles");

    return auth0Logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }, [auth0Logout]);

  // Role checking utilities
  const hasRole = useCallback(
    (requiredRole) => {
      return roles.includes(requiredRole);
    },
    [roles]
  );

  const hasAnyRole = useCallback(
    (requiredRoles = []) => {
      return requiredRoles.some((role) => roles.includes(role));
    },
    [roles]
  );

  // Overall loading state
  const isLoading = auth0Loading || tokenLoading || !authReady;

  // Memoize context value with all dependencies
  const value = useMemo(
    () => ({
      isAuthenticated,
      isLoading,
      user,
      login,
      logout,
      token,
      roles,
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
      roles,
      hasRole,
      hasAnyRole,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
