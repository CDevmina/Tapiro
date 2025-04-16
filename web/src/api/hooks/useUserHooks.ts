import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClients } from "../apiClient";
import { cacheKeys, cacheSettings, optimisticUpdates } from "../utils/cache";
import { UserPreferencesUpdate, UserUpdate } from "../types/data-contracts";

export function useUserProfile() {
  const { users } = useApiClients();

  return useQuery({
    queryKey: cacheKeys.users.profile(),
    queryFn: () => users.getUserProfile().then((res) => res.data),
    ...cacheSettings.user,
  });
}

export function useUpdateUserProfile() {
  const { users } = useApiClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: UserUpdate) =>
      users.updateUserProfile(userData).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.users.profile() });
    },
  });
}

export function useUserPreferences() {
  const { users } = useApiClients();

  return useQuery({
    queryKey: cacheKeys.users.preferences(),
    queryFn: () => users.getUserOwnPreferences().then((res) => res.data),
    ...cacheSettings.preferences,
  });
}

export function useUpdateUserPreferences() {
  const { users } = useApiClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (preferences: UserPreferencesUpdate) =>
      users.updateUserPreferences(preferences).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: cacheKeys.users.preferences(),
      });
    },
  });
}

export function useOptInToStore() {
  const { users } = useApiClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storeId: string) =>
      users.optInToStore(storeId).then((res) => res.data),
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
  const { users } = useApiClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storeId: string) =>
      users.optOutFromStore(storeId).then((res) => res.data),
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
  const { users } = useApiClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => users.deleteUserProfile().then((res) => res.data),
    onSuccess: () => {
      // After successful deletion, clear user-related cache
      queryClient.invalidateQueries({ queryKey: ["auth", "metadata"] });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}
