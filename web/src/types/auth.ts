export interface User {
  email: string;
  email_verified: boolean;
  sub: string;
  picture?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user?: User;
  isLoading: boolean;
  error?: Error;
}
