import { useEffect, useState, useCallback } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useUserService } from "@/services/userService";
import { ReactNode } from "react";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { tokenManager } from "./TokenManager";

interface AuthStateManagerProps {
  children: ReactNode;
}

interface ApiError {
  code: number;
  message: string;
}

// Define registration data types
interface BaseRegistrationData {
  registrationAttempts: number;
}

interface UserRegistrationData extends BaseRegistrationData {
  username: string;
  name?: string;
  dataSharingConsent: boolean;
  preferences?: string[];
}

interface StoreRegistrationData extends BaseRegistrationData {
  name: string;
  bussinessType: string;
  address: string;
  dataSharingConsent: boolean;
  webhookUrl?: string;
  webhookEvents?: Array<"purchase" | "opt-out">;
}

// Navigation state type
interface NavigationState {
  error?: string;
}

export const AuthStateManager = ({ children }: AuthStateManagerProps) => {
  const { isAuthenticated, user, isLoading, error: auth0Error } = useAuth0();
  const { getUserProfile, registerUser, registerStore } = useUserService();
  const [isInitialized, setIsInitialized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  // Extract error message from API response
  const extractErrorMessage = useCallback((error: unknown): string => {
    return error instanceof AxiosError && error.response?.data?.message
      ? error.response.data.message
      : "An unexpected error occurred. Please try again.";
  }, []);

  // Handle initialization errors
  const handleInitializationError = useCallback((error: unknown): void => {
    if (error instanceof AxiosError) {
      console.error("User initialization failed:", {
        status: error.response?.status,
        data: error.response?.data as ApiError,
      });
    } else {
      console.error("Unknown error:", error);
    }
    setErrorMessage("Failed to initialize user. Please try again later.");
  }, []);

  // Clear registration data from session storage
  const clearRegistrationData = useCallback((): void => {
    sessionStorage.removeItem("registration_type");
    sessionStorage.removeItem("registration_data");
  }, []);

  // Handle conflict errors (email or username already exists)
  const handleConflictError = useCallback((): void => {
    // Clear registration data
    clearRegistrationData();

    // Reset token if needed
    tokenManager.clearToken();

    // Redirect to login with appropriate message
    const navigationState: NavigationState = {
      error:
        "This email or username is already registered. Please login instead.",
    };

    navigate("/login", { state: navigationState });
  }, [clearRegistrationData, navigate]);

  // Check if error is a conflict (duplicate) error
  const isConflictError = useCallback((error: unknown): boolean => {
    return (
      error instanceof AxiosError &&
      error.response?.status === 409 &&
      typeof error.response.data?.message === "string" &&
      error.response.data.message.includes("already taken")
    );
  }, []);

  // Handle errors during registration
  const handleRegistrationError = useCallback(
    (error: unknown, registrationType: string): void => {
      // If we get a specific duplicate email/username error
      if (isConflictError(error)) {
        handleConflictError();
      } else {
        // Handle other registration errors
        const message = extractErrorMessage(error);
        setErrorMessage(message);

        // On error, redirect back to the registration page
        const navigationState: NavigationState = { error: message };

        if (registrationType === "user") {
          navigate("/register/user", { state: navigationState });
        } else {
          navigate("/register/store", { state: navigationState });
        }
      }
    },
    [isConflictError, handleConflictError, extractErrorMessage, navigate]
  );

  // Handle too many registration attempts
  const handleTooManyAttempts = useCallback((): void => {
    console.warn("Too many registration attempts - possible duplicate account");
    clearRegistrationData();

    const navigationState: NavigationState = {
      error:
        "This email appears to be already registered. Please try logging in instead.",
    };

    navigate("/login", { state: navigationState });
  }, [clearRegistrationData, navigate]);

  // Handle registration process
  const handleRegistration = useCallback(
    async (
      registrationType: string,
      registrationDataStr: string
    ): Promise<void> => {
      try {
        const parsedData = JSON.parse(registrationDataStr);
        const attempts = parsedData.registrationAttempts || 0;

        // Limit retries to prevent infinite loops
        if (attempts > 2) {
          handleTooManyAttempts();
          return;
        }

        // Update attempt counter
        const registrationData = {
          ...parsedData,
          registrationAttempts: attempts + 1,
        };

        sessionStorage.setItem(
          "registration_data",
          JSON.stringify(registrationData)
        );

        // NEW CODE: Ensure we have a valid token before proceeding
        try {
          // Wait for token to be available (with timeout)
          let retries = 0;
          const maxRetries = 3;
          while (retries < maxRetries) {
            try {
              await tokenManager.getToken();
              break; // Token is available, proceed with registration
            } catch (tokenError) {
              retries++;
              if (retries >= maxRetries) throw tokenError;
              console.log(`Waiting for token... attempt ${retries}`);
              await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 1 second between attempts
            }
          }
        } catch (tokenError) {
          console.error("Failed to get authentication token:", tokenError);
          throw new Error(
            "Authentication token unavailable. Please try again."
          );
        }

        // User successfully authenticated with Auth0, now register in our system
        if (registrationType === "user") {
          await registerUser(registrationData as UserRegistrationData);
          console.log("User registration completed");
        } else if (registrationType === "store") {
          await registerStore(registrationData as StoreRegistrationData);
          console.log("Store registration completed");
        }

        // Clear registration data after successful registration
        clearRegistrationData();

        // Redirect to home
        navigate("/");
      } catch (error) {
        handleRegistrationError(error, registrationType);
      }
    },
    [
      handleTooManyAttempts,
      registerUser,
      registerStore,
      clearRegistrationData,
      navigate,
      handleRegistrationError,
    ]
  );

  // Check if user profile exists
  const checkUserProfile = useCallback(async (): Promise<void> => {
    try {
      const profile = await getUserProfile();
      console.debug("User profile found:", profile.data);
    } catch (error) {
      if (error instanceof AxiosError && error.response?.status === 404) {
        // User authenticated but not registered - redirect to registration type page
        navigate("/register");
      } else {
        // Handle other API errors
        const message = extractErrorMessage(error);
        setErrorMessage(message);
        console.error("API error:", error);
      }
    }
  }, [getUserProfile, navigate, extractErrorMessage]);

  useEffect(() => {
    // Don't do anything while Auth0 is still loading
    if (isLoading) return;

    // Handle Auth0 errors
    if (auth0Error) {
      console.error("Auth0 error:", auth0Error);
      setErrorMessage("Authentication error. Please try again later.");
      setIsInitialized(true);
      return;
    }

    const initializeUser = async () => {
      // Only proceed if user is authenticated and we have user data
      if (isAuthenticated && user) {
        try {
          // Check if we have pending registration data in sessionStorage
          const registrationType = sessionStorage.getItem("registration_type");
          const registrationDataStr =
            sessionStorage.getItem("registration_data");

          // If we have registration data, proceed with registration flow
          if (registrationType && registrationDataStr) {
            await handleRegistration(registrationType, registrationDataStr);
          } else {
            // No pending registration, check if user profile exists
            await checkUserProfile();
          }
        } catch (error) {
          handleInitializationError(error);
        } finally {
          setIsInitialized(true);
        }
      } else {
        setIsInitialized(true);
      }
    };

    initializeUser();
  }, [
    isAuthenticated,
    user,
    isLoading,
    auth0Error,
    handleRegistration,
    checkUserProfile,
    handleInitializationError,
  ]);

  // Show loading state while initializing
  if (!isInitialized) {
    return <LoadingSpinner message="Loading application..." />;
  }

  // Show error state if there was an error
  if (errorMessage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded-lg max-w-md">
          <h2 className="text-lg font-semibold mb-2">Error</h2>
          <p>{errorMessage}</p>
          <button
            onClick={() => {
              setErrorMessage(null);
              navigate("/");
            }}
            className="mt-4 btn btn-primary"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
