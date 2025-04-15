import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth"; // This is your context hook
// Import from the swagger-codegen output
import {
  AuthenticationApi,
  Configuration,
  UserCreate,
  StoreCreate,
  UserMetadataUpdate, // Uncommented this import
  BaseAPI,
} from "../client";
import { queryClient, cacheKeys } from "../utils/cache";

// Note: setAuthToken and the 'api' object from client.ts are no longer needed
// Note: Type aliases using 'components' from '../types' are no longer needed

// Rename hook to avoid conflict with context hook
export const useAuthApi = () => {
  const auth = useAuth(); // Use the context hook

  // Helper to create configured API instances (can be shared)
  const createApiInstance = async <T extends BaseAPI>(
    ApiClass: new (config: Configuration) => T,
  ): Promise<T> => {
    const token = await auth.getAccessToken();
    const config = new Configuration({
      accessToken: token ? `Bearer ${token}` : undefined,
      // basePath: import.meta.env.VITE_API_URL,
    });
    return new ApiClass(config);
  };

  // Register as user
  const useRegisterUser = () => {
    return useMutation({
      // Use UserCreate type from swagger/api.ts
      mutationFn: async (userData: UserCreate) => {
        const authApi = await createApiInstance(AuthenticationApi);
        // Pass body directly as first argument
        const newUser = await authApi.registerUser(userData, {});
        return newUser; // Assuming it returns the created user
      },
      onSuccess: (_data) => {
        // Invalidate user profile to refresh data
        // Use the specific cache key from cache.ts
        queryClient.invalidateQueries({ queryKey: cacheKeys.users.profile() });
        // Optionally update cache directly if needed
        // queryClient.setQueryData(cacheKeys.users.profile(), data);
      },
      // Consider adding onError
    });
  };

  // Register as store
  const useRegisterStore = () => {
    return useMutation({
      // Use StoreCreate type from swagger/api.ts
      mutationFn: async (storeData: StoreCreate) => {
        const authApi = await createApiInstance(AuthenticationApi);
        // Pass body directly as first argument
        const newStore = await authApi.registerStore(storeData, {});
        return newStore; // Assuming it returns the created store
      },
      onSuccess: (_data) => {
        // Invalidate store profile to refresh data
        // Use the specific cache key from cache.ts
        queryClient.invalidateQueries({ queryKey: cacheKeys.stores.profile() });
        // Optionally update cache directly if needed
        // queryClient.setQueryData(cacheKeys.stores.profile(), data);
      },
      // Consider adding onError
    });
  };

  // Implementation for Update User Metadata
  const useUpdateUserMetadata = () => {
    return useMutation({
      mutationFn: async (metadata: UserMetadataUpdate) => {
        const authApi = await createApiInstance(AuthenticationApi);
        const response = await authApi.updateUserMetadata(metadata, {});
        return response;
      },
      onSuccess: () => {
        // Invalidate relevant queries to refresh data
        queryClient.invalidateQueries({ queryKey: cacheKeys.users.profile() });
      },
      onError: (error) => {
        console.error("Failed to update user metadata:", error);
      },
    });
  };

  return {
    useRegisterUser,
    useRegisterStore,
    useUpdateUserMetadata, // Uncommented this
  };
};
