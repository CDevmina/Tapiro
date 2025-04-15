import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { api, setAuthToken } from "../client";
import { queryClient } from "../utils/cache";
import { components } from "../types";

type UserCreate = components["schemas"]["UserCreate"];
type StoreCreate = components["schemas"]["StoreCreate"];
type UserMetadataUpdate = components["schemas"]["UserMetadataUpdate"];

export const useAuthApi = () => {
  const auth = useAuth();

  // Helper to set up auth for each request
  const setupAuth = async () => {
    const token = await auth.getAccessToken();
    if (token) {
      setAuthToken(token);
    }
    return token;
  };

  // Register as user
  const useRegisterUser = () => {
    return useMutation({
      mutationFn: async (userData: UserCreate) => {
        await setupAuth();
        const response = await api.auth.registerUser({ body: userData });
        return response.data;
      },
      onSuccess: () => {
        // Invalidate user profile to refresh data
        queryClient.invalidateQueries({ queryKey: ["users", "profile"] });
      },
    });
  };

  // Register as store
  const useRegisterStore = () => {
    return useMutation({
      mutationFn: async (storeData: StoreCreate) => {
        await setupAuth();
        const response = await api.auth.registerStore({ body: storeData });
        return response.data;
      },
      onSuccess: () => {
        // Invalidate store profile to refresh data
        queryClient.invalidateQueries({ queryKey: ["stores", "profile"] });
      },
    });
  };

  // Additional auth hooks...

  return {
    useRegisterUser,
    useRegisterStore,
    // Include other hooks...
  };
};
