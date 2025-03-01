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
  } = useAuth0();
  const navigate = useNavigate();

  const login = useCallback(async () => {
    await loginWithRedirect({
      appState: { returnTo: window.location.pathname },
    });
  }, [loginWithRedirect]);

  const register = useCallback(() => {
    navigate("/register");
  }, [navigate]);

  const logoutUser = useCallback(() => {
    logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  }, [logout]);

  const getToken = useCallback(async () => {
    return await getAccessTokenSilently();
  }, [getAccessTokenSilently]);

  return {
    isAuthenticated,
    user,
    login,
    register,
    logout: logoutUser,
    getToken,
  };
};
