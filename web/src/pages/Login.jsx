import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { Button, Spinner } from "../components/common";

function Login() {
  const { isAuthenticated, isLoading, login, registration } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || "/";

  useEffect(() => {
    if (isAuthenticated) {
      if (!registration.isComplete) {
        // If logged in but registration not complete, go to registration flow
        navigate("/register", { replace: true });
      } else {
        // Registration complete, go to requested page or dashboard
        const dashboardPath =
          registration.type === "store" ? "/store-dashboard" : "/profile";
        navigate(returnTo || dashboardPath, { replace: true });
      }
    }
  }, [isAuthenticated, registration, navigate, returnTo]);

  const handleLogin = () => {
    login();
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Spinner size="xl" />
        <p className="mt-4 text-gray-600">Checking your credentials...</p>
      </div>
    );
  }

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
