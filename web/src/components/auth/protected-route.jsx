import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Spinner } from "../common";

export function ProtectedRoute({ children, requiredRoles = [] }) {
  // isLoading is handled globally by AuthGuard, but keep for safety during transitions
  // registration check is removed - AuthGuard handles redirecting to /register
  const { isAuthenticated, isLoading, hasAnyRole } = useAuth();
  const location = useLocation();

  // Still show loading spinner if AuthProvider state is loading
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="xl" />
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return (
      <Navigate to="/login" state={{ returnTo: location.pathname }} replace />
    );
  }

  // AuthGuard ensures registration is complete before reaching here (unless on /register itself).
  // Now, just check roles.
  if (requiredRoles.length > 0 && !hasAnyRole(requiredRoles)) {
    // If roles are required and the user doesn't have any of them, redirect to unauthorized
    return <Navigate to="/unauthorized" replace />;
  }

  // If authenticated and roles match (or no roles required), render the child component.
  return children;
}
