import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import { api, setAuthToken } from "../client";
import {
  cacheKeys,
  cacheSettings,
  queryClient,
  optimisticUpdates,
} from "../utils/cache";
import { components } from "../types";

type User = components["schemas"]["User"];
type UserPreferences = components["schemas"]["UserPreferences"];
type UserUpdate = components["schemas"]["UserUpdate"];
type UserPreferencesUpdate = components["schemas"]["UserPreferencesUpdate"];

export const useUsers = () => {
  const auth = useAuth();

  // Helper to set up auth for each request
  const setupAuth = async () => {
    const token = await auth.getAccessToken();
    if (token) {
      setAuthToken(token);
    }
    return token;
  };

  // Get the current user's profile
  const useUserProfile = () => {
    return useQuery<User>({
      queryKey: cacheKeys.users.profile(),
      queryFn: async () => {
        await setupAuth();
        const response = await api.users.getProfile({});
        return response.data;
      },
      ...cacheSettings.user,
      enabled: auth.isAuthenticated,
    });
  };

  // Get user's preferences
  const useUserPreferences = () => {
    return useQuery<UserPreferences>({
      queryKey: cacheKeys.users.preferences(),
      queryFn: async () => {
        await setupAuth();
        const response = await api.users.getPreferences({});
        return response.data;
      },
      ...cacheSettings.preferences,
      enabled: auth.isAuthenticated,
    });
  };

  // Update user's preferences
  const useUpdateUserPreferences = () => {
    return useMutation({
      mutationFn: async (preferences: UserPreferencesUpdate) => {
        await setupAuth();
        const response = await api.users.updatePreferences({
          body: preferences,
        });
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: cacheKeys.users.preferences(),
        });
      },
    });
  };

  // Opt-in to a store
  const useOptInToStore = () => {
    return useMutation({
      mutationFn: async (storeId: string) => {
        await setupAuth();
        await api.users.optInToStore({ path: { storeId } });
      },
      onMutate: (storeId) => {
        // Optimistically update the UI
        optimisticUpdates.optInStore(storeId);
      },
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: cacheKeys.users.preferences(),
        });
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
