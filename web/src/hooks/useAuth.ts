import { useAuth0 } from "@auth0/auth0-react";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { tokenManager } from "../auth/TokenManager";

export const useAuth = () => {
  const {
    isAuthenticated,
    user,
    loginWithRedirect,
    logout: auth0Logout,
    isLoading,
    error,
  } = useAuth0();
  const navigate = useNavigate();

  // Helper to handle login errors - memoize with useCallback
  const handleLoginError = useCallback(() => {
    const registrationType = sessionStorage.getItem("registration_type");
    const errorMessage =
      "Failed to connect to authentication service. Please try again.";

    if (registrationType === "user") {
      navigate("/register/user", { state: { error: errorMessage } });
    } else if (registrationType === "store") {
      navigate("/register/store", { state: { error: errorMessage } });
    } else {
      navigate("/register", { state: { error: errorMessage } });
    }
  }, [navigate]);

  // Improved login with better error handling
  const login = useCallback(async () => {
    try {
      const registrationType = sessionStorage.getItem("registration_type");

      await loginWithRedirect({
        appState: {
          returnTo: window.location.pathname,
          registrationType,
        },
        authorizationParams: {
          screen_hint: "signup",
        },
      });
    } catch (err) {
      console.error("Login failed:", err);
      handleLoginError();
    }
  }, [loginWithRedirect, handleLoginError]);

  const register = useCallback(() => {
    navigate("/register");
  }, [navigate]);

  const logoutUser = useCallback(() => {
    // Clear registration data on logout
    sessionStorage.removeItem("registration_type");
    sessionStorage.removeItem("registration_data");

    // Clear token cache
    tokenManager.clearToken();

    auth0Logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }, [auth0Logout]);

  // Use tokenManager instead of direct getAccessTokenSilently
  const getToken = useCallback(async () => {
    try {
      return await tokenManager.getToken();
    } catch (err) {
      console.error("Error getting token:", err);
      throw err;
    }
  }, []);

  return {
    isAuthenticated,
    user,
    login,
    register,
    logout: logoutUser,
    getToken,
    isLoading,
    error,
  };
};
