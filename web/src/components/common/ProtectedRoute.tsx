import { useEffect } from "react";
import { useAuth } from "../../hooks/useAuth";
import { useLocation } from "react-router-dom";
import { LoadingSpinner } from "./LoadingSpinner";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, login } = useAuth();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      // Store the current path to redirect back after login
      login();
    }
  }, [isAuthenticated, login, location.pathname]);

  if (!isAuthenticated) {
    return <LoadingSpinner fullHeight message="Authenticating..." />;
  }

  return <>{children}</>;
};
