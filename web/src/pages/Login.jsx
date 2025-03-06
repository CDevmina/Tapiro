import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { Button, Spinner } from "../components/common";

function Login() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const returnTo = location.state?.returnTo || "/";

  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      navigate(returnTo);
    }
  }, [isAuthenticated, isLoading, navigate, returnTo]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
        <Spinner size="xl" />
        <p className="mt-4 text-gray-600">Checking authentication status...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-xl shadow-md">
      <h1 className="text-2xl font-bold text-center mb-6">Login to Tapiro</h1>
      <p className="mb-6 text-gray-600 text-center">
        Please login to access your account and use our services.
      </p>
      <div className="flex justify-center">
        <Button onClick={login} fullWidth>
          Login with Auth0
        </Button>
      </div>
    </div>
  );
}

export default Login;
