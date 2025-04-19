import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClients } from "../apiClient";
import { cacheKeys, cacheSettings, optimisticUpdates } from "../utils/cache";
import {
  UserPreferencesUpdate,
  UserUpdate,
  User,
} from "../types/data-contracts"; // Import User type
import { useAuth } from "../../hooks/useAuth"; // Import useAuth

export function useUserProfile() {
  const { apiClients, clientsReady } = useApiClients();
  return useQuery({
    queryKey: cacheKeys.users.profile(),
    queryFn: () => apiClients.users.getUserProfile().then((res) => res.data),
    enabled: clientsReady,
    ...cacheSettings.user,
  });
}

export function useUpdateUserProfile() {
  const { apiClients } = useApiClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: UserUpdate) =>
      apiClients.users.updateUserProfile(userData).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.users.profile() });
    },
  });
}

export function useUserPreferences() {
  // Get clientsReady state
  const { apiClients, clientsReady } = useApiClients();
  const { isAuthenticated, isLoading: authLoading } = useAuth(); // Get auth state

  return useQuery({
    queryKey: cacheKeys.users.preferences(),
    queryFn: () =>
      apiClients.users.getUserOwnPreferences().then((res) => res.data),
    // Update enabled check
    enabled: isAuthenticated && !authLoading && clientsReady,
    ...cacheSettings.preferences,
  });
}

export function useUpdateUserPreferences() {
  const { apiClients } = useApiClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: UserPreferencesUpdate) =>
      apiClients.users
        .updateUserPreferences(preferences)
        .then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: cacheKeys.users.preferences(),
      });
    },
  });
}

export function useOptInToStore() {
  const { apiClients } = useApiClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storeId: string) =>
      apiClients.users.optInToStore(storeId).then((res) => res.data),
    onMutate: async (storeId) => {
      const profileQueryKey = cacheKeys.users.profile(); // Use profile key
      await queryClient.cancelQueries({ queryKey: profileQueryKey });
      const previousData = queryClient.getQueryData<User>(profileQueryKey); // Expect User type

      optimisticUpdates.optInStore(storeId);

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          cacheKeys.users.profile(), // Rollback profile cache
          context.previousData,
        );
      }
    },
    onSettled: () => {
      // Invalidate both profile and preferences as backend updates both
      queryClient.invalidateQueries({ queryKey: cacheKeys.users.profile() });
      queryClient.invalidateQueries({
        queryKey: cacheKeys.users.preferences(),
      });
      // Also invalidate consenting stores list as it depends on profile data
      queryClient.invalidateQueries({
        queryKey: cacheKeys.users.dashboard.consentingStores(),
      });
    },
  });
}

export function useOptOutFromStore() {
  const { apiClients } = useApiClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storeId: string) =>
      apiClients.users.optOutFromStore(storeId).then((res) => res.data),
    onMutate: async (storeId) => {
      const profileQueryKey = cacheKeys.users.profile(); // Use profile key
      await queryClient.cancelQueries({ queryKey: profileQueryKey });
      const previousData = queryClient.getQueryData<User>(profileQueryKey); // Expect User type

      optimisticUpdates.optOutStore(storeId);

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousData) {
        queryClient.setQueryData(
          cacheKeys.users.profile(), // Rollback profile cache
          context.previousData,
        );
      }
    },
    onSettled: () => {
      // Invalidate both profile and preferences as backend updates both
      queryClient.invalidateQueries({ queryKey: cacheKeys.users.profile() });
      queryClient.invalidateQueries({
        queryKey: cacheKeys.users.preferences(),
      });
      // Also invalidate consenting stores list
      queryClient.invalidateQueries({
        queryKey: cacheKeys.users.dashboard.consentingStores(),
      });
    },
  });
}

export function useDeleteUserProfile() {
  const { apiClients } = useApiClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClients.users.deleteUserProfile().then((res) => res.data),
    onSuccess: () => {
      // After successful deletion, clear user-related cache
      queryClient.invalidateQueries({ queryKey: ["auth", "metadata"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
