import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button, Spinner } from "../components/common";

function Login() {
  // isLoading is handled by AuthGuard, but keep for local spinner display
  // registration check is removed from here
  const { isAuthenticated, isLoading, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  // Get the intended destination from location state, default to root
  const returnTo = location.state?.returnTo || "/";

  useEffect(() => {
    // If the user is already authenticated when they land on the /login page,
    // redirect them away immediately. AuthGuard will handle the /register redirect if needed.
    if (isAuthenticated && !isLoading) {
      // Navigate to where the user intended to go, or the root.
      // AuthGuard will intercept if registration isn't complete.
      navigate(returnTo, { replace: true });
    }
    // React only when isAuthenticated or isLoading changes.
  }, [isAuthenticated, isLoading, navigate, returnTo]);

  const handleLogin = () => {
    // Pass the original intended destination (returnTo) to Auth0's login,
    // so the onRedirectCallback in Auth0ProviderWithNavigate can use it.
    login({ appState: { returnTo } });
  };

  // Show loading spinner if AuthProvider is loading
  // This might be brief as AuthGuard also shows a spinner
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Spinner size="xl" />
        <p className="mt-4 text-gray-600">Checking your credentials...</p>
      </div>
    );
  }

  // If not loading and not authenticated, show the login prompt.
  // If authenticated, the useEffect above should have redirected.
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-6 text-center">
        Welcome to Tapiro
      </h2>

      <p className="text-gray-600 mb-6">
        Sign in to access your personalized dashboard and settings.
      </p>

      <div className="flex justify-center">
        <Button onClick={handleLogin} variant="primary" size="lg">
          Sign In / Sign Up
        </Button>
      </div>
    </div>
  );
}

export default Login;
