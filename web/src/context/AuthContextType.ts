import { createContext } from "react";

export interface AuthContextProps {
  isLoading: boolean;
  isAuthenticated: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any;
  userRoles: string[];
  getAccessToken: () => Promise<string | undefined>;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

// Export the context so it can be imported by useAuth.ts and AuthContext.tsx
export const AuthContext = createContext<AuthContextProps | undefined>(
  undefined,
);
