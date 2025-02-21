import { ReactNode } from "react";
import { Auth0Provider, Auth0ProviderOptions } from "@auth0/auth0-react";
import { AUTH_CONFIG } from "./AuthConfig";

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const config: Auth0ProviderOptions = {
    domain: AUTH_CONFIG.domain,
    clientId: AUTH_CONFIG.clientId,
    authorizationParams: {
      redirect_uri: AUTH_CONFIG.redirectUri,
      audience: AUTH_CONFIG.audience,
      scope: AUTH_CONFIG.scope,
    },
    useRefreshTokens: true,
    cacheLocation: "localstorage",
  };

  return <Auth0Provider {...config}>{children}</Auth0Provider>;
};
