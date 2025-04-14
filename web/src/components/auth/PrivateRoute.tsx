import React from "react";
import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "../../hooks/useAuth";
import LoadingSpinner from "../common/LoadingSpinner"; // Import the spinner
import ErrorDisplay from "../common/ErrorDisplay"; // Import ErrorDisplay for unauthorized

interface PrivateRouteProps {
  allowedRoles?: string[]; // Roles allowed to access this route
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ allowedRoles }) => {
  const { isAuthenticated, isLoading, userRoles } = useAuth(); // Removed login, not needed here
  const location = useLocation();

  if (isLoading) {
    // Use the LoadingSpinner component
    return <LoadingSpinner message="Checking authentication..." />;
  }

  if (!isAuthenticated) {
    // Not authenticated, redirect to login page or trigger login
    // Optionally store the intended destination
    // login(); // Or redirect to a dedicated login page
    // Redirecting home, Auth0Provider handles the actual login redirect
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // Check roles if allowedRoles are provided
  if (allowedRoles && allowedRoles.length > 0) {
    const hasRequiredRole = allowedRoles.some((role) =>
      userRoles.includes(role),
    );
    if (!hasRequiredRole) {
      // Authenticated but not authorized for this route
      console.warn(
        `User does not have required roles: ${allowedRoles.join(", ")}. User roles: ${userRoles.join(", ")}`,
      );
      // Option 1: Redirect to a dedicated unauthorized page (if you create one)
      // return <Navigate to="/unauthorized" replace />;

      // Option 2: Show an inline error message
      return (
        <ErrorDisplay
          title="Access Denied"
          message="You do not have the necessary permissions to view this page."
        />
      );
    }
  }

  // Authenticated and authorized (or no specific roles required)
  return <Outlet />; // Render the child route components
};

export default PrivateRoute;
