import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { Spinner } from "../common";

export function AuthGuard({ children }) {
  const { isAuthenticated, isLoading, registration } = useAuth();
  const location = useLocation();

  if (isLoading) {
    // Show a full-page loading spinner while auth state and registration status are checked
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Spinner size="xl" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    );
  }

  // If authenticated but registration is not complete,
  // and we are not already on the registration page, redirect to /register.
  if (
    isAuthenticated &&
    !registration.isComplete &&
    location.pathname !== "/register"
  ) {
    // Pass the current location so the user can be returned after registration
    return (
      <Navigate
        to="/register"
        state={{ returnTo: location.pathname }}
        replace
      />
    );
  }

  // Otherwise, render the requested route.
  return children;
}
