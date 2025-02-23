import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useUserService } from "@/services/userService";
import { ReactNode } from "react";
import { AxiosError } from "axios";

interface AuthStateManagerProps {
  children: ReactNode;
}

interface ApiError {
  code: number;
  message: string;
}

export const AuthStateManager = ({ children }: AuthStateManagerProps) => {
  const { isAuthenticated, user } = useAuth0();
  const { getUserProfile, registerUser } = useUserService();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeUser = async () => {
      if (isAuthenticated && user) {
        try {
          // Try to get user profile first
          try {
            const profile = await getUserProfile();
            console.debug("User profile found:", profile.data);
          } catch (error) {
            // If user not found (404), then register
            if (error instanceof AxiosError && error.response?.status === 404) {
              console.debug("User not found, registering...");
              await registerUser({
                role: "user",
                data_sharing: false,
              });
              console.debug("User registered successfully");

              // Get profile after registration
              const profile = await getUserProfile();
              console.debug("New user profile:", profile.data);
            } else {
              throw error;
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
  }, [isAuthenticated, user, getUserProfile, registerUser]);

  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  return <>{children}</>;
};
