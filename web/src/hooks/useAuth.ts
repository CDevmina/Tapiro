import { useAuth0 } from "@auth0/auth0-react";
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";

export const useAuth = () => {
  const {
    isAuthenticated,
    user,
    getAccessTokenSilently,
    loginWithRedirect,
    logout,
    isLoading,
    error,
  } = useAuth0();
  const navigate = useNavigate();

  const login = useCallback(async () => {
    try {
      await loginWithRedirect({
        appState: { returnTo: window.location.pathname },
        authorizationParams: {
          screen_hint: "signup", // Hint to Auth0 that this is a signup flow
        },
      });
    } catch (err) {
      console.error("Login failed:", err);
      // Return to the registration form if login fails
      const registrationType = sessionStorage.getItem("registration_type");
      if (registrationType === "user") {
        navigate("/register/user", {
          state: {
            error:
              "Failed to connect to authentication service. Please try again.",
          },
        });
      } else if (registrationType === "store") {
        navigate("/register/store", {
          state: {
            error:
              "Failed to connect to authentication service. Please try again.",
          },
        });
      } else {
        navigate("/register", {
          state: {
            error:
              "Failed to connect to authentication service. Please try again.",
          },
        });
      }
    }
  }, [loginWithRedirect, navigate]);

  const register = useCallback(() => {
    navigate("/register");
  }, [navigate]);

  const logoutUser = useCallback(() => {
    // Clear any registration data on logout
    sessionStorage.removeItem("registration_type");
    sessionStorage.removeItem("registration_data");

    logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }, [logout]);

  const getToken = useCallback(async () => {
    try {
      return await getAccessTokenSilently();
    } catch (err) {
      console.error("Error getting token:", err);
      throw err;
    }
  }, [getAccessTokenSilently]);

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
