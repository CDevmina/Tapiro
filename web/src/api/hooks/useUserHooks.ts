import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClients } from "../apiClient";
import { cacheKeys, cacheSettings, optimisticUpdates } from "../utils/cache";
import {
  UserPreferencesUpdate,
  UserUpdate,
  User,
  RecentUserDataEntry,
  StoreConsentList,
  MonthlySpendingAnalytics,
  GetSpendingAnalyticsParams,
  GetRecentUserDataParams, // <-- Import params type for recent data
  UserDataDeletionRequest, // Import the request type if you defined it in openapi.yaml components
} from "../types/data-contracts";
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
      // Optimistic update on the USER PROFILE cache
      const queryKey = cacheKeys.users.profile(); // <--- Use profile key
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<User>(queryKey); // <--- Use User type

      // Apply optimistic update (which now targets the profile cache)
      optimisticUpdates.optInStore(storeId);

      return { previousData, queryKey }; // Pass queryKey for rollback/settled
    },
    onError: (_err, _variables, context) => {
      // Rollback on error using the correct key and data
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      // Invalidate the USER PROFILE cache on settled
      if (context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
      // Also invalidate the consent list cache
      queryClient.invalidateQueries({
        queryKey: cacheKeys.users.storeConsent(),
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
      // Optimistic update on the USER PROFILE cache
      const queryKey = cacheKeys.users.profile(); // <--- Use profile key
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<User>(queryKey); // <--- Use User type

      // Apply optimistic update (which now targets the profile cache)
      optimisticUpdates.optOutStore(storeId);

      return { previousData, queryKey }; // Pass queryKey for rollback/settled
    },
    onError: (_err, _variables, context) => {
      // Rollback on error using the correct key and data
      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      // Invalidate the USER PROFILE cache on settled
      if (context?.queryKey) {
        queryClient.invalidateQueries({ queryKey: context.queryKey });
      }
      // Also invalidate the consent list cache
      queryClient.invalidateQueries({
        queryKey: cacheKeys.users.storeConsent(),
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

// --- New Hooks ---

// Update useRecentUserData to accept GetRecentUserDataParams
export function useRecentUserData(params?: GetRecentUserDataParams) {
  const { apiClients, clientsReady } = useApiClients();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Use the params object directly for the queryKey
  const queryParams = params || {}; // Ensure params is an object

  return useQuery<RecentUserDataEntry[], Error>({
    queryKey: cacheKeys.users.recentData(queryParams), // Pass the params object
    queryFn: () =>
      // Pass the params object to the API call
      apiClients.users
        .getRecentUserData(queryParams) // Pass the whole object
        .then((res) => res.data),
    enabled: isAuthenticated && !authLoading && clientsReady,
    placeholderData: (previousData) => previousData,
  });
}

export function useSpendingAnalytics(
  params?: GetSpendingAnalyticsParams, // Accept optional params
) {
  const { apiClients, clientsReady } = useApiClients();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Destructure params for queryKey dependency, provide defaults
  const { startDate, endDate } = params || {};

  return useQuery<MonthlySpendingAnalytics, Error>({
    // <-- Use new response type
    // Update queryKey to include dates for unique caching
    queryKey: cacheKeys.users.spendingAnalytics(startDate, endDate),
    queryFn: () =>
      // Pass params to the API call
      apiClients.users
        .getSpendingAnalytics({ startDate, endDate })
        .then((res) => res.data),
    enabled: isAuthenticated && !authLoading && clientsReady,
    // Add specific cache settings if needed
    // ...cacheSettings.analytics, // Example
    placeholderData: (previousData) => previousData, // Keep placeholderData for smoother transitions
  });
}

export function useStoreConsentLists() {
  const { apiClients, clientsReady } = useApiClients();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  return useQuery<StoreConsentList, Error>({
    // Expect StoreConsentList type
    queryKey: cacheKeys.users.storeConsent(),
    queryFn: () =>
      apiClients.users.getStoreConsentLists().then((res) => res.data),
    enabled: isAuthenticated && !authLoading && clientsReady,
    // Add specific cache settings if needed
    // ...cacheSettings.consent, // Example
  });
}

export function useDeleteUserDataHistory() {
  const { apiClients, clientsReady } = useApiClients();
  const queryClient = useQueryClient();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  return useMutation<
    void, // Assuming 204 No Content response
    Error,
    UserDataDeletionRequest // Type for the request body
  >({
    mutationFn: (deletionRequest: UserDataDeletionRequest) => {
      if (!clientsReady || !isAuthenticated || authLoading) {
        return Promise.reject(
          new Error("API client not ready or user not authenticated."),
        );
      }
      // Assuming your generated client has a method like 'deleteUserDataHistory'
      // Adjust the method name if it's different based on your openapi-generator config
      return apiClients.users
        .deleteUserDataHistory(deletionRequest)
        .then((res) => res.data);
    },
    onSuccess: () => {
      // Invalidate queries that display this data
      // This will cause components using these queries to refetch
      queryClient.invalidateQueries({ queryKey: cacheKeys.users.recentData() });
      queryClient.invalidateQueries({
        queryKey: cacheKeys.users.spendingAnalytics(),
      });
      // Potentially show a success toast
    },
    onError: (error) => {
      // Potentially show an error toast
      console.error("Failed to delete user data history:", error);
    },
  });
}
