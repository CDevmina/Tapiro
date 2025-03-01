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
  const { isAuthenticated, user } = useAuth0();
  const { getUserProfile, registerUser, registerStore } = useUserService();
  const [isInitialized, setIsInitialized] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const initializeUser = async () => {
      if (isAuthenticated && user) {
        try {
          // Check if we have pending registration data in sessionStorage
          const registrationType = sessionStorage.getItem("registration_type");
          const registrationDataStr =
            sessionStorage.getItem("registration_data");

          if (registrationType && registrationDataStr) {
            const registrationData = JSON.parse(registrationDataStr);

            try {
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
              console.error("Registration failed:", error);

              // On error, redirect back to the registration page
              if (registrationType === "user") {
                navigate("/register/user");
              } else {
                navigate("/register/store");
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
                throw error;
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
    getUserProfile,
    registerUser,
    registerStore,
    navigate,
  ]);

  if (!isInitialized) {
    return <LoadingSpinner fullHeight message="Loading application..." />;
  }

  return <>{children}</>;
};
