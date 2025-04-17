import { createContext } from "react";
import { User } from "@auth0/auth0-react";

export interface AuthContextProps {
  isLoading: boolean;
  isAuthenticated: boolean;
  user: User | undefined;
  userRoles: string[];
  getAccessToken: () => Promise<string>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  tokenError: Error | null;
}

// Export the context so it can be imported by useAuth.ts and AuthContext.tsx
export const AuthContext = createContext<AuthContextProps | undefined>(
  undefined,
);
