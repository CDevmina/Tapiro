import {
  useMutation,
  useQuery,
  useQueryClient,
  QueryKey,
} from "@tanstack/react-query"; // Import QueryKey
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
  Error, // <-- Import Error type
} from "../types/data-contracts";
import { useAuth } from "../../hooks/useAuth"; // Import useAuth

// Define a type for the context returned by onMutate
interface MutationContext {
  previousData?: User | undefined;
  queryKey?: QueryKey;
}

export function useUserProfile() {
  const { apiClients, clientsReady } = useApiClients();
  const { isAuthenticated, isLoading: authLoading } = useAuth(); // Get auth state
  return useQuery<User, Error>({
    // Specify types
    queryKey: cacheKeys.users.profile(),
    queryFn: () => apiClients.users.getUserProfile().then((res) => res.data),
    // Update enabled check
    enabled: isAuthenticated && !authLoading && clientsReady,
    ...cacheSettings.user,
  });
}

export function useUpdateUserProfile() {
  const { apiClients } = useApiClients();
  const queryClient = useQueryClient();

  return useMutation<User, Error, UserUpdate>({
    // Specify types
    mutationFn: (userData: UserUpdate) =>
      apiClients.users.updateUserProfile(userData).then((res) => res.data),
    onSuccess: (updatedUser) => {
      // Can use updatedUser if needed
      // Invalidate or directly update the cache
      queryClient.setQueryData(cacheKeys.users.profile(), updatedUser);
      // Optionally invalidate if optimistic updates aren't enough or for related data
      // queryClient.invalidateQueries({ queryKey: cacheKeys.users.profile() });
    },
  });
}

export function useUserPreferences() {
  // Get clientsReady state
  const { apiClients, clientsReady } = useApiClients();
  const { isAuthenticated, isLoading: authLoading } = useAuth(); // Get auth state

  return useQuery({
    // Add types if UserPreferences type exists
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
    // Add types if UserPreferences type exists
    mutationFn: (preferences: UserPreferencesUpdate) =>
      apiClients.users
        .updateUserPreferences(preferences)
        .then((res) => res.data),
    onSuccess: (updatedPreferences) => {
      // Can use updatedPreferences
      // Invalidate or directly update the cache
      queryClient.setQueryData(
        cacheKeys.users.preferences(),
        updatedPreferences,
      );
      // Optionally invalidate
      // queryClient.invalidateQueries({
      //   queryKey: cacheKeys.users.preferences(),
      // });
    },
  });
}

export function useOptInToStore() {
  const { apiClients } = useApiClients();
  const queryClient = useQueryClient();

  return useMutation<void, Error, string, MutationContext>({
    // Add MutationContext type
    // Specify types
    mutationFn: (storeId: string) =>
      apiClients.users.optInToStore(storeId).then((res) => res.data),
    onMutate: async (storeId) => {
      // Optimistic update on the USER PROFILE cache
      const queryKey = cacheKeys.users.profile(); // <--- Use profile key
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<User>(queryKey); // <--- Use User type

      // Apply optimistic update (which now targets the profile cache)
      if (previousData) {
        optimisticUpdates.optInStore(storeId); // Apply optimistic update locally
      }

      return { previousData, queryKey }; // Pass queryKey for rollback/settled
    },
    onError: (_err, _variables, context) => {
      // Context is now typed
      // Rollback on error using the correct key and data
      // Check if context and its properties exist before using them
      if (context?.queryKey && context.previousData !== undefined) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      // Context is now typed
      // Invalidate the USER PROFILE cache on settled
      // Check if context and queryKey exist
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

  return useMutation<void, Error, string, MutationContext>({
    // Add MutationContext type
    // Specify types
    mutationFn: (storeId: string) =>
      apiClients.users.optOutFromStore(storeId).then((res) => res.data),
    onMutate: async (storeId) => {
      // Optimistic update on the USER PROFILE cache
      const queryKey = cacheKeys.users.profile(); // <--- Use profile key
      await queryClient.cancelQueries({ queryKey });
      const previousData = queryClient.getQueryData<User>(queryKey); // <--- Use User type

      // Apply optimistic update (which now targets the profile cache)
      if (previousData) {
        optimisticUpdates.optOutStore(storeId); // Apply optimistic update locally
      }

      return { previousData, queryKey }; // Pass queryKey for rollback/settled
    },
    onError: (_err, _variables, context) => {
      // Context is now typed
      // Rollback on error using the correct key and data
      // Check if context and its properties exist before using them
      if (context?.queryKey && context.previousData !== undefined) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },
    onSettled: (_data, _error, _variables, context) => {
      // Context is now typed
      // Invalidate the USER PROFILE cache on settled
      // Check if context and queryKey exist
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

  return useMutation<void, Error, void>({
    // Specify types
    mutationFn: () =>
      apiClients.users.deleteUserProfile().then((res) => res.data),
    onSuccess: () => {
      // After successful deletion, clear user-related cache
      queryClient.invalidateQueries({ queryKey: ["auth", "metadata"] });
      queryClient.invalidateQueries({ queryKey: cacheKeys.users.all }); // Invalidate all user queries
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
