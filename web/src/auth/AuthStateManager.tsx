import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useUserService } from "@/services/userService";
import { ReactNode } from "react";

interface AuthStateManagerProps {
  children: ReactNode;
}

export const AuthStateManager = ({ children }: AuthStateManagerProps) => {
  const { isAuthenticated, user } = useAuth0();
  const { getUserProfile, registerUser } = useUserService();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initializeUser = async () => {
      if (isAuthenticated && user) {
        try {
          const response = await getUserProfile();
          if (response.status === 404) {
            await registerUser({
              role: "user",
              data_sharing: false,
            });
          }
        } catch (error) {
          console.error("User initialization failed:", error);
        }
      }
      setIsInitialized(true);
    };

    initializeUser();
  }, [isAuthenticated, user, getUserProfile, registerUser]);

  if (!isInitialized) {
    return <div>Loading...</div>;
  }

  return children;
};
