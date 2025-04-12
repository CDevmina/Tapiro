import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { AuthContext } from "./AuthContext";
import axios from "axios"; // Add this import

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
  const [registrationStatus, setRegistrationStatus] = useState({
    complete: false,
    type: null,
    isChecking: false,
  });

  // Define API URL directly
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  // Check registration status when authenticated
  useEffect(() => {
    const checkRegistrationStatus = async () => {
      if (!isAuthenticated || !user) return;

      try {
        setRegistrationStatus((prev) => ({ ...prev, isChecking: true }));

        // Direct API call instead of using useAuthApi hook
        const accessToken = await getAccessTokenSilently();
        const response = await axios.post(
          `${API_URL}/users/metadata/get`,
          {},
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
          }
        );

        const { metadata } = response.data;

        setRegistrationStatus({
          complete: metadata?.registrationComplete || false,
          type: metadata?.registrationType || null,
          isChecking: false,
        });
      } catch (error) {
        console.error("Failed to check registration status:", error);
        setRegistrationStatus({
          complete: false,
          type: null,
          isChecking: false,
        });
      }
    };

    if (isAuthenticated && user && !auth0Loading) {
      checkRegistrationStatus();
    }
  }, [isAuthenticated, user, auth0Loading, getAccessTokenSilently, API_URL]);

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
  const isLoading =
    auth0Loading ||
    isInitializing ||
    !authReady ||
    registrationStatus.isChecking;

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
      registration: {
        isComplete: registrationStatus.complete,
        type: registrationStatus.type,
      },
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
      registrationStatus,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
