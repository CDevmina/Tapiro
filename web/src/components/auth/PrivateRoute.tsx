import React from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import LoadingSpinner from "../common/LoadingSpinner";
import ErrorDisplay from "../common/ErrorDisplay";

interface PrivateRouteProps {
  allowedRoles?: string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ allowedRoles }) => {
  const {
    isAuthenticated,
    isLoading: authLoading,
    userRoles,
    tokenError,
  } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner message="Checking authentication..." />
      </div>
    );
  }

  if (tokenError) {
    return (
      <ErrorDisplay
        title="Authentication Error"
        message={`Failed to verify authentication status: ${tokenError.message}. Please try logging out and back in.`}
        error={tokenError}
      />
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    if (userRoles.length === 0 && !authLoading) {
      return (
        <div className="flex h-screen items-center justify-center">
          <LoadingSpinner message="Loading user permissions..." />
        </div>
      );
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

  return <Outlet />;
};

export default PrivateRoute;
