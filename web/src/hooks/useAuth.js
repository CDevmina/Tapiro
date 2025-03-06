import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useState } from "react";

export function useAuth() {
  const {
    isAuthenticated,
    isLoading,
    user,
    loginWithRedirect,
    logout,
    getAccessTokenSilently,
  } = useAuth0();

  const [token, setToken] = useState(null);
  const [tokenLoading, setTokenLoading] = useState(false);
  const [roles, setRoles] = useState([]);

  useEffect(() => {
    const getToken = async () => {
      if (isAuthenticated) {
        try {
          setTokenLoading(true);
          const accessToken = await getAccessTokenSilently();
          setToken(accessToken);

          // Extract roles from user data
          const userRoles = user?.["https://tapiro.com/roles"] || [];
          setRoles(userRoles);
        } catch (error) {
          console.error("Failed to get access token", error);
        } finally {
          setTokenLoading(false);
        }
      }
    };

    getToken();
  }, [getAccessTokenSilently, isAuthenticated, user]);

  const handleLogin = () => {
    return loginWithRedirect();
  };

  const handleLogout = () => {
    return logout({
      logoutParams: {
        returnTo: window.location.origin,
      },
    });
  };

  const hasRole = (requiredRole) => {
    return roles.includes(requiredRole);
  };

  return {
    isAuthenticated,
    isLoading: isLoading || tokenLoading,
    user,
    login: handleLogin,
    logout: handleLogout,
    token,
    roles,
    hasRole,
  };
}
