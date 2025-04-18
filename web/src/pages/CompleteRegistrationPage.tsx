import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useRegisterUser, useRegisterStore } from "../api/hooks/useAuthHooks"; // #useAuthHooks.ts
import { UserCreate, StoreCreate } from "../api/types/data-contracts";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorDisplay from "../components/common/ErrorDisplay";
import { useAuth } from "../hooks/useAuth"; // Import useAuth
import axios from "axios";
import { useApiClients } from "../api/apiClient";

type RegistrationData = {
  type: "user" | "store";
  data: UserCreate | StoreCreate;
};

export default function CompleteRegistrationPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth(); // Check auth status
  const { clientsReady } = useApiClients(); // <-- Get clientsReady state
  const registerUserMutation = useRegisterUser();
  const registerStoreMutation = useRegisterStore();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true); // Start in processing state

  useEffect(() => {
    // Wait for auth state AND API clients to be ready
    if (authLoading || !clientsReady) {
      console.log(
        "CompleteRegistrationPage: Waiting for auth state and API clients...",
        { authLoading, clientsReady },
      );
      // Keep showing loading spinner if auth isn't loaded OR clients aren't ready
      setIsProcessing(true);
      return; // Wait for auth state and clients to settle
    }

    // If we get here, auth is loaded and clients are ready (or should be)
    // Check authentication status *after* loading is complete
    if (!isAuthenticated) {
      console.error("User not authenticated on complete-registration page.");
      setError(
        "Authentication failed. Please try logging in or registering again.",
      );
      setIsProcessing(false);
      return;
    }

    console.log(
      "CompleteRegistrationPage: User authenticated and clients ready, proceeding...",
    );

    // Retrieve data from sessionStorage
    const storedData = sessionStorage.getItem("registrationData");
    // IMPORTANT: Clear data immediately after retrieving
    sessionStorage.removeItem("registrationData");

    if (!storedData) {
      console.warn(
        "No registration data found in sessionStorage. Redirecting home.",
      );
      navigate("/");
      return;
    }

    // --- Rest of the useEffect remains the same ---
    let registrationData: RegistrationData | null = null;
    try {
      registrationData = JSON.parse(storedData);
      console.log("Retrieved registration data:", registrationData);
    } catch (e) {
      console.error("Failed to parse registration data:", e);
      setError("Failed to process registration data. Please try again.");
      setIsProcessing(false);
      return;
    }

    if (!registrationData || !registrationData.type || !registrationData.data) {
      console.error("Invalid registration data format.");
      setError("Invalid registration data. Please try again.");
      setIsProcessing(false);
      return;
    }

    const completeRegistration = async () => {
      try {
        if (registrationData?.type === "user") {
          console.log("Calling registerUser mutation...");
          await registerUserMutation.mutateAsync(
            registrationData.data as UserCreate,
          );
          console.log("User registration successful.");
          navigate("/dashboard/user");
        } else if (registrationData?.type === "store") {
          console.log("Calling registerStore mutation...");
          await registerStoreMutation.mutateAsync(
            registrationData.data as StoreCreate,
          );
          console.log("Store registration successful.");
          navigate("/dashboard/store");
        }
      } catch (err: unknown) {
        console.error("Registration API call failed:", err);
        let message = "An unexpected error occurred.";
        if (axios.isAxiosError(err) && err.response?.data?.message) {
          message = err.response.data.message;
        } else if (err instanceof Error) {
          message = err.message;
        }
        setError(`Registration failed: ${message}`);
        // Only stop processing on error; success leads to navigation
        setIsProcessing(false);
      }
    };

    completeRegistration();
    // --- End of unchanged block ---

    // Update dependencies for the effect
  }, [
    isAuthenticated,
    authLoading,
    clientsReady,
    navigate,
    registerUserMutation,
    registerStoreMutation,
  ]); // <-- Add clientsReady and mutations/navigate

  // Update loading condition
  if (authLoading || !clientsReady || isProcessing) {
    return <LoadingSpinner message="Completing registration..." />;
  }

  // --- Rest of the component remains the same (error display, fallback) ---
  if (error) {
    return <ErrorDisplay title="Registration Error" message={error} />;
  }

  return <LoadingSpinner message="Redirecting..." />;
}
