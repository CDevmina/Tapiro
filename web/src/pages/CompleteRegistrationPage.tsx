import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useRegisterUser, useRegisterStore } from "../api/hooks/useAuthHooks"; // #useAuthHooks.ts
import { UserCreate, StoreCreate } from "../api/types/data-contracts";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorDisplay from "../components/common/ErrorDisplay";
import { useAuth } from "../hooks/useAuth"; // Import useAuth
import axios from "axios"; // <-- Import axios

type RegistrationData = {
  type: "user" | "store";
  data: UserCreate | StoreCreate;
};

export default function CompleteRegistrationPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading } = useAuth(); // Check auth status
  const registerUserMutation = useRegisterUser();
  const registerStoreMutation = useRegisterStore();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(true); // Start in processing state

  useEffect(() => {
    // Only proceed if authentication is confirmed and not loading
    if (authLoading) {
      console.log("CompleteRegistrationPage: Waiting for auth state...");
      return; // Wait for auth state to settle
    }

    if (!isAuthenticated) {
      console.error("User not authenticated on complete-registration page.");
      setError(
        "Authentication failed. Please try logging in or registering again.",
      );
      setIsProcessing(false);
      return;
    }

    console.log("CompleteRegistrationPage: User authenticated, proceeding...");

    // Retrieve data from sessionStorage
    const storedData = sessionStorage.getItem("registrationData");
    // IMPORTANT: Clear data immediately after retrieving to prevent re-processing on refresh/re-render
    sessionStorage.removeItem("registrationData");

    if (!storedData) {
      console.warn(
        "No registration data found in sessionStorage. Redirecting home.",
      );
      // If no data, maybe they landed here by mistake or already completed. Redirect.
      navigate("/"); // Or to a relevant dashboard if possible
      return; // Stop further execution in this effect
    }

    let registrationData: RegistrationData | null = null;
    try {
      registrationData = JSON.parse(storedData);
      console.log("Retrieved registration data:", registrationData);
    } catch (e) {
      console.error("Failed to parse registration data:", e);
      setError("Failed to process registration data. Please try again.");
      setIsProcessing(false);
      return; // Stop further execution
    }

    if (!registrationData || !registrationData.type || !registrationData.data) {
      console.error("Invalid registration data format.");
      setError("Invalid registration data. Please try again.");
      setIsProcessing(false);
      return; // Stop further execution
    }

    // Define the async function to call the mutation
    const completeRegistration = async () => {
      try {
        if (registrationData?.type === "user") {
          console.log("Calling registerUser mutation...");
          // Use mutateAsync to await the result for navigation
          await registerUserMutation.mutateAsync(
            registrationData.data as UserCreate,
          );
          console.log("User registration successful.");
          navigate("/dashboard/user"); // Redirect to user dashboard on success
        } else if (registrationData?.type === "store") {
          console.log("Calling registerStore mutation...");
          // Use mutateAsync to await the result for navigation
          await registerStoreMutation.mutateAsync(
            registrationData.data as StoreCreate,
          );
          console.log("Store registration successful.");
          navigate("/dashboard/store"); // Redirect to store dashboard on success
        }
      } catch (err: unknown) {
        // <-- Type err as unknown
        // Catch specific error type if possible
        console.error("Registration API call failed:", err);
        // Try to get a meaningful error message
        let message = "An unexpected error occurred.";
        // Use axios type guard to safely access response data
        if (axios.isAxiosError(err) && err.response?.data?.message) {
          message = err.response.data.message;
        } else if (err instanceof Error) {
          // Check if standard Error
          message = err.message;
        }
        setError(`Registration failed: ${message}`);
        setIsProcessing(false); // Stop processing indicator on error
      }
      // No finally block needed for setIsProcessing(false) because navigation happens on success
    };

    // Call the async function
    completeRegistration();

    // Dependency array ensures this runs only when auth state changes from loading to loaded/authenticated
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, authLoading]); // Depend only on auth state changes

  // Display loading or error states
  // Show loading spinner while auth is loading OR while processing the registration data/mutation
  if (authLoading || isProcessing) {
    return <LoadingSpinner message="Completing registration..." />;
  }

  // Show error if one occurred during the process
  if (error) {
    return (
      <ErrorDisplay
        title="Registration Error"
        message={error}
        // Optionally add a button to retry or go home
        // e.g., <Button onClick={() => navigate('/')}>Go Home</Button>
      />
    );
  }

  // Fallback: Should ideally redirect before reaching here, but show loading just in case.
  return <LoadingSpinner message="Redirecting..." />;
}
