import { useAuth0 } from "@auth0/auth0-react";
import { useCallback } from "react";

export const useAuth = () => {
  const {
    isAuthenticated,
    user,
    getAccessTokenSilently,
    loginWithRedirect,
    logout,
  } = useAuth0();

  const login = useCallback(async () => {
    await loginWithRedirect({
      appState: { returnTo: window.location.pathname },
    });
  }, [loginWithRedirect]);

  const register = useCallback(async () => {
    await loginWithRedirect({
      appState: { returnTo: window.location.pathname },
      authorizationParams: {
        screen_hint: "signup",
      },
    });
  }, [loginWithRedirect]);

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
