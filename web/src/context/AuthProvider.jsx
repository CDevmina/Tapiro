import { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { AuthContext } from "./AuthContext";
import axios from "axios"; // Add axios back

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
    isChecking: true,
  });

  // Add API_URL back
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

  // Define checkRegistrationStatus using useCallback - REVERTED TO AXIOS
  const checkRegistrationStatus = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setRegistrationStatus({ complete: false, type: null, isChecking: false });
      return;
    }

    try {
      setRegistrationStatus((prev) => ({ ...prev, isChecking: true }));

      // Use axios directly again
      const accessToken = await getAccessTokenSilently();
      const response = await axios.post(
        `${API_URL}/users/metadata/get`,
        {}, // Empty body for POST request
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
  }, [isAuthenticated, user, getAccessTokenSilently, API_URL]);

  // Check status on auth change
  useEffect(() => {
    if (isAuthenticated && user && !auth0Loading) {
      checkRegistrationStatus();
    } else if (!isAuthenticated && !auth0Loading) {
      // If not authenticated, registration is not applicable/complete
      setRegistrationStatus({ complete: false, type: null, isChecking: false });
    }
  }, [isAuthenticated, user, auth0Loading, checkRegistrationStatus]); // Use the callback here

  // Simplified initialization
  useEffect(() => {
    const prepareAuth = async () => {
      try {
        // Attempt to get a token silently to ensure session is active if needed
        if (await isAuthenticated) {
          // Check if potentially authenticated
          await getAccessTokenSilently();
        }
      } catch (error) {
        // Ignore errors here, likely means user is not logged in
        console.log("Auth initialization check:", error.message);
      } finally {
        setIsInitializing(false);
        setAuthReady(true);
      }
    };
    // Only run prepareAuth once on mount or if auth0Loading status changes significantly
    if (!auth0Loading) {
      prepareAuth();
    }
  }, [auth0Loading, getAccessTokenSilently, isAuthenticated]); // Added isAuthenticated

  const login = useCallback(
    (options) => {
      // Ensure appState is passed correctly if provided
      return loginWithRedirect(options);
    },
    [loginWithRedirect]
  );

  const logout = useCallback(() => {
    return auth0Logout({
      logoutParams: { returnTo: window.location.origin },
    });
  }, [auth0Logout]);

  const getRoles = useCallback(() => {
    return user?.["https://tapiro.com/roles"] || [];
  }, [user]);

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

  // isLoading now depends on Auth0 loading, initialization, AND registration check
  const isLoading =
    auth0Loading ||
    isInitializing ||
    !authReady ||
    registrationStatus.isChecking;

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
      // Expose the refresh function
      refreshRegistrationStatus: checkRegistrationStatus,
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
      checkRegistrationStatus, // Add callback to dependencies
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
