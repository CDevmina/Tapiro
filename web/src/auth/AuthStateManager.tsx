import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useUserService } from "@/services/userService";
import { ReactNode } from "react";
import { AxiosError } from "axios";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

interface AuthStateManagerProps {
  children: ReactNode;
}

interface ApiError {
  code: number;
  message: string;
}

export const AuthStateManager = ({ children }: AuthStateManagerProps) => {
  const { isAuthenticated, user, isLoading, error: auth0Error } = useAuth0();
  const { getUserProfile, registerUser, registerStore } = useUserService();
  const [isInitialized, setIsInitialized] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

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

          if (registrationType && registrationDataStr) {
            const registrationData = JSON.parse(registrationDataStr);
            const attempts = registrationData.registrationAttempts || 0;

            // Limit retries to prevent infinite loops
            if (attempts > 2) {
              console.warn(
                "Too many registration attempts - possible duplicate account"
              );
              sessionStorage.removeItem("registration_type");
              sessionStorage.removeItem("registration_data");

              navigate("/login", {
                state: {
                  error:
                    "This email appears to be already registered. Please try logging in instead.",
                },
              });
              return;
            }

            // Update attempt counter
            registrationData.registrationAttempts = attempts + 1;
            sessionStorage.setItem(
              "registration_data",
              JSON.stringify(registrationData)
            );

            try {
              // User successfully authenticated with Auth0, now we can register them in our system
              if (registrationType === "user") {
                await registerUser(registrationData);
                console.log("User registration completed");
              } else if (registrationType === "store") {
                await registerStore(registrationData);
                console.log("Store registration completed");
              }

              // Clear registration data after successful registration
              sessionStorage.removeItem("registration_type");
              sessionStorage.removeItem("registration_data");

              // Redirect to home
              navigate("/");
            } catch (error) {
              // If we get a specific duplicate email error
              if (
                error instanceof AxiosError &&
                error.response?.status === 409 &&
                error.response.data?.message?.includes("already taken")
              ) {
                // Clear registration data
                sessionStorage.removeItem("registration_type");
                sessionStorage.removeItem("registration_data");

                // Redirect to login
                navigate("/login", {
                  state: {
                    error:
                      "This email is already registered. Please login instead.",
                  },
                });
              } else {
                console.error("Registration failed:", error);

                let message = "Registration failed. Please try again.";

                // Extract specific error message if available
                if (
                  error instanceof AxiosError &&
                  error.response?.data?.message
                ) {
                  message = error.response.data.message;
                }

                // Show error message to user
                setErrorMessage(message);

                // On error, redirect back to the registration page
                if (registrationType === "user") {
                  navigate("/register/user", { state: { error: message } });
                } else {
                  navigate("/register/store", { state: { error: message } });
                }
              }
            }
          } else {
            // No pending registration, just check if user profile exists
            try {
              const profile = await getUserProfile();
              console.debug("User profile found:", profile.data);
            } catch (error) {
              if (
                error instanceof AxiosError &&
                error.response?.status === 404
              ) {
                // User authenticated but not registered - redirect to registration type page
                navigate("/register");
              } else {
                // Handle other API errors
                const message =
                  error instanceof AxiosError && error.response?.data?.message
                    ? error.response.data.message
                    : "Error fetching your profile. Please try again.";

                setErrorMessage(message);
                console.error("API error:", error);
              }
            }
          }
        } catch (error) {
          if (error instanceof AxiosError) {
            console.error("User initialization failed:", {
              status: error.response?.status,
              data: error.response?.data as ApiError,
            });
          } else {
            console.error("Unknown error:", error);
          }
          setErrorMessage("Failed to initialize user. Please try again later.");
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
    getUserProfile,
    registerUser,
    registerStore,
    navigate,
  ]);

  // Show loading state while initializing
  if (!isInitialized) {
    return <LoadingSpinner fullHeight message="Loading application..." />;
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
