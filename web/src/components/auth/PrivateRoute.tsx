import React from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import LoadingSpinner from "../common/LoadingSpinner";
import ErrorDisplay from "../common/ErrorDisplay";
import { useRegistrationStatus } from "../../hooks/useRegistrationStatus";
import { RegistrationCompletionModal } from "./RegistrationCompletionModal";

interface PrivateRouteProps {
  allowedRoles?: string[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, isLoading: authLoading, userRoles } = useAuth();
  const location = useLocation();
  const { isLoading: registrationLoading, shouldShowRegistration } =
    useRegistrationStatus();

  // Wait for authentication AND registration status to complete
  if (authLoading || registrationLoading) {
    return <LoadingSpinner message="Checking authentication and status..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // If authenticated but registration is not complete, show the modal
  if (shouldShowRegistration) {
    // Render the modal directly, blocking access to the Outlet
    return <RegistrationCompletionModal />;
  }

  // Only check roles after loading is complete, auth is confirmed, AND registration is complete
  if (allowedRoles && allowedRoles.length > 0) {
    // Add additional check to ensure userRoles array is populated
    if (userRoles.length === 0) {
      // This might indicate roles haven't loaded from the token yet, though authLoading should cover this.
      // Keep a spinner here as a fallback.
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

  // Authenticated, registration complete, and authorized
  return <Outlet />;
};

export default PrivateRoute;
