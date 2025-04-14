import React from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import LoadingSpinner from "../common/LoadingSpinner";
import ErrorDisplay from "../common/ErrorDisplay";

interface PrivateRouteProps {
  allowedRoles?: string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, isLoading, userRoles } = useAuth();
  const location = useLocation();

  // Wait for authentication to complete and roles to load
  if (isLoading) {
    return <LoadingSpinner message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Only check roles after loading is complete and we have data from Auth0
  if (allowedRoles && allowedRoles.length > 0) {
    // Add additional check to ensure userRoles array is populated
    if (userRoles.length === 0) {
      // Still loading roles or user has no roles yet
      return <LoadingSpinner message="Loading user permissions..." />;
    }

    const hasRequiredRole = allowedRoles.some((role) =>
      userRoles.includes(role),
    );

    if (!hasRequiredRole) {
      console.warn(
        `User does not have required roles: ${allowedRoles.join(", ")}. User roles: ${userRoles.join(", ")}`,
      );
      return (
        <ErrorDisplay
          title="Access Denied"
          message="You do not have the necessary permissions to view this page."
        />
      );
    }
  }

  // Authenticated and authorized
  return <Outlet />;
};

export default PrivateRoute;
