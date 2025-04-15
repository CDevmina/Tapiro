import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
// Import from the swagger-codegen output
import {
  UserManagementApi,
  PreferenceManagementApi,
  Configuration,
  User,
  UserPreferences,
  UserPreferencesUpdate,
  BaseAPI, // Import BaseAPI if needed for the helper
} from "../client"; // Adjusted import path
import {
  cacheKeys,
  cacheSettings,
  queryClient,
  optimisticUpdates,
} from "../utils/cache";

// Note: setAuthToken and the 'api' object from client.ts are no longer needed
// Note: Type aliases using 'components' from '../types' are no longer needed

export const useUsers = () => {
  const auth = useAuth();

  // Helper to create configured API instances
  const createApiInstance = async <T extends BaseAPI>(
    ApiClass: new (config: Configuration) => T,
  ): Promise<T> => {
    const token = await auth.getAccessToken();
    const config = new Configuration({
      // Pass token for Bearer authentication
      accessToken: token ? `Bearer ${token}` : undefined,
      // Set basePath if your API isn't at the default swagger path
      // basePath: import.meta.env.VITE_API_URL,
    });
    return new ApiClass(config);
  };

  // Get the current user's profile using swagger-codegen client
  const useUserProfile = () => {
    return useQuery<User>({
      // Use User type from swagger/api.ts
      queryKey: cacheKeys.users.profile(),
      queryFn: async () => {
        const userApi = await createApiInstance(UserManagementApi);
        // Call the method from the swagger-codegen client instance
        // Pass empty object or specific options if needed by the generated method
        const userProfile = await userApi.getUserProfile({});
        // swagger-codegen fetch client usually returns the parsed data directly
        return userProfile;
      },
      ...cacheSettings.user,
      enabled: auth.isAuthenticated,
    });
  };

  // Get user's preferences using swagger-codegen client
  const useUserPreferences = () => {
    return useQuery<UserPreferences>({
      // Use UserPreferences type from swagger/api.ts
      queryKey: cacheKeys.users.preferences(),
      queryFn: async () => {
        const prefApi = await createApiInstance(PreferenceManagementApi);
        // Use the correct method name from swagger/api.ts
        const preferences = await prefApi.getUserOwnPreferences({});
        return preferences;
      },
      ...cacheSettings.preferences,
      enabled: auth.isAuthenticated,
    });
  };

  // Update user's preferences using swagger-codegen client
  const useUpdateUserPreferences = () => {
    return useMutation({
      // Use UserPreferencesUpdate type from swagger/api.ts
      mutationFn: async (preferences: UserPreferencesUpdate) => {
        const prefApi = await createApiInstance(PreferenceManagementApi);
        // Pass the body directly as the first argument
        const updatedPreferences = await prefApi.updateUserPreferences(
          preferences,
          {},
        );
        return updatedPreferences;
      },
      onSuccess: (data) => {
        // Update cache with the returned data
        queryClient.setQueryData(cacheKeys.users.preferences(), data);
        // Or invalidate if you prefer refetching
        // queryClient.invalidateQueries({ queryKey: cacheKeys.users.preferences() });
      },
      // Consider adding onError for error handling
    });
  };

  // Opt-in to a store using swagger-codegen client
  const useOptInToStore = () => {
    return useMutation({
      mutationFn: async (storeId: string) => {
        const prefApi = await createApiInstance(PreferenceManagementApi);
        // Pass path parameters directly as arguments
        await prefApi.optInToStore(storeId, {});
        // This method might return void or a response object depending on generation
      },
      onMutate: (storeId) => {
        optimisticUpdates.optInStore(storeId);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: cacheKeys.users.preferences(),
        });
        // Also potentially invalidate user profile if opt-in affects it
        queryClient.invalidateQueries({ queryKey: cacheKeys.users.profile() });
      },
      onError: (error, storeId, context) => {
        // Revert optimistic update logic here if needed
        console.error("Opt-in failed:", error);
        // Example: queryClient.setQueryData(cacheKeys.users.preferences(), context?.previousPreferences);
      },
    });
  };

  // More user-related hooks...

  return {
    useUserProfile,
    useUserPreferences,
    useUpdateUserPreferences,
    useOptInToStore,
    // Include other hooks...
  };
};
