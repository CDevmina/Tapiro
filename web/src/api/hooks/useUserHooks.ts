import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClients } from "../apiClient";
import { cacheKeys, cacheSettings, optimisticUpdates } from "../utils/cache";
import { UserPreferencesUpdate, UserUpdate } from "../types/data-contracts";
import { useAuth } from "../../hooks/useAuth"; // Import useAuth

export function useUserProfile() {
  const { apiClients, isTokenSet } = useApiClients(); // Get isTokenSet
  const { isAuthenticated, isLoading: authLoading } = useAuth(); // Get auth state

  return useQuery({
    queryKey: cacheKeys.users.profile(),
    queryFn: () => apiClients.users.getUserProfile().then((res) => res.data),
    // Add auth and token checks to enabled condition
    enabled: isAuthenticated && !authLoading && isTokenSet,
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
  const { apiClients, isTokenSet } = useApiClients(); // Get isTokenSet
  const { isAuthenticated, isLoading: authLoading } = useAuth(); // Get auth state

  return useQuery({
    queryKey: cacheKeys.users.preferences(),
    queryFn: () =>
      apiClients.users.getUserOwnPreferences().then((res) => res.data),
    // Add auth and token checks to enabled condition
    enabled: isAuthenticated && !authLoading && isTokenSet,
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
      // Optimistic update
      await queryClient.cancelQueries({
        queryKey: cacheKeys.users.preferences(),
      });
      const previousData = queryClient.getQueryData(
        cacheKeys.users.preferences(),
      );

      // Apply optimistic update from cache.ts
      optimisticUpdates.optInStore(storeId);

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          cacheKeys.users.preferences(),
          context.previousData,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: cacheKeys.users.preferences(),
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
      // Optimistic update
      await queryClient.cancelQueries({
        queryKey: cacheKeys.users.preferences(),
      });
      const previousData = queryClient.getQueryData(
        cacheKeys.users.preferences(),
      );

      // Apply optimistic update from cache.ts
      optimisticUpdates.optOutStore(storeId);

      return { previousData };
    },
    onError: (_err, _variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(
          cacheKeys.users.preferences(),
          context.previousData,
        );
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({
        queryKey: cacheKeys.users.preferences(),
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
