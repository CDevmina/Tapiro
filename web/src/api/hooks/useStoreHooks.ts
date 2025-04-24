import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClients } from "../apiClient";
import { cacheKeys, cacheSettings, CACHE_TIMES } from "../utils/cache";
import {
  ApiKeyCreate,
  StoreUpdate,
  StoreBasicInfo,
  Error,
  SearchStoresParams,
  GetApiKeyUsagePayload, // <-- Import payload type for usage stats
  GetApiUsageLogParams, // <-- Import params type for usage log
  ApiUsageLogEntry, // <-- Import log entry type
  PaginationInfo, // <-- Import pagination info type
} from "../types/data-contracts";
import { useAuth } from "../../hooks/useAuth";
import { useState, useEffect } from "react";

// Define the expected response structure for getApiUsageLog
interface ApiUsageLogResponse {
  logs?: ApiUsageLogEntry[];
  pagination?: PaginationInfo;
}

export function useStoreProfile() {
  // Get clientsReady state
  const { apiClients, clientsReady } = useApiClients();
  const { isAuthenticated, isLoading: authLoading } = useAuth(); // Get auth state

  return useQuery({
    queryKey: cacheKeys.stores.profile(),
    queryFn: () => apiClients.stores.getStoreProfile().then((res) => res.data),
    // Update enabled check
    enabled: isAuthenticated && !authLoading && clientsReady,
    ...cacheSettings.store,
  });
}

export function useUpdateStoreProfile() {
  const { apiClients } = useApiClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storeData: StoreUpdate) =>
      apiClients.stores.updateStoreProfile(storeData).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.stores.profile() });
    },
  });
}

export function useApiKeys() {
  // Get clientsReady state
  const { apiClients, clientsReady } = useApiClients();
  const { isAuthenticated, isLoading: authLoading } = useAuth(); // Get auth state

  return useQuery({
    queryKey: cacheKeys.stores.apiKeys(),
    queryFn: () => apiClients.stores.getApiKeys().then((res) => res.data),
    // Update enabled check
    enabled: isAuthenticated && !authLoading && clientsReady,
    ...cacheSettings.apiKeys,
  });
}

export function useCreateApiKey() {
  const { apiClients } = useApiClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keyData?: ApiKeyCreate) =>
      apiClients.stores.createApiKey(keyData).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.stores.apiKeys() });
    },
  });
}

export function useRevokeApiKey() {
  const { apiClients } = useApiClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keyId: string) =>
      apiClients.stores.revokeApiKey(keyId).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.stores.apiKeys() });
    },
  });
}

// Update useApiKeyUsage to accept payload
export function useApiKeyUsage(
  keyId: string,
  payload?: GetApiKeyUsagePayload, // Accept payload
) {
  const { apiClients, clientsReady } = useApiClients();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Include payload in the query key if present
  // This object now matches the expected parameter type for the updated cache key
  const queryKeyParams = { keyId, ...payload };

  return useQuery({
    // This call should now be valid
    queryKey: cacheKeys.stores.apiKeyUsage(queryKeyParams),
    queryFn: () =>
      // Pass payload to the API call
      apiClients.stores.getApiKeyUsage(keyId, payload).then((res) => res.data),
    enabled: !!keyId && isAuthenticated && !authLoading && clientsReady,
    ...cacheSettings.apiKeys, // Consider specific cache settings for usage
  });
}

// --- New Hook for API Usage Log ---
export function useApiUsageLog(params?: GetApiUsageLogParams) {
  const { apiClients, clientsReady } = useApiClients();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Ensure params is always an object for the query key
  const queryParams = params || {};

  return useQuery<ApiUsageLogResponse, Error>({
    // Use the defined response type
    queryKey: cacheKeys.stores.apiUsageLog(queryParams), // Use the new cache key
    queryFn: () =>
      // Pass the queryParams object to the API client method
      apiClients.stores.getApiUsageLog(queryParams).then((res) => res.data),
    // Enable only when authenticated and client is ready
    enabled: isAuthenticated && !authLoading && clientsReady,
    // Keep previous data while fetching new page/filters
    placeholderData: (previousData) => previousData,
    // Consider specific cache settings for logs if needed
    // staleTime: CACHE_TIMES.SHORT,
  });
}
// --- End New Hook ---

export function useSearchStores(searchTerm: string, debounceMs = 300) {
  const { apiClients, clientsReady } = useApiClients();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);

  // Debounce effect
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, debounceMs);

    // Cleanup function to cancel the timeout if searchTerm changes again quickly
    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, debounceMs]);

  // Define query parameters type if not auto-generated
  // type SearchStoresParams = { query: string; limit?: number };

  return useQuery<StoreBasicInfo[], Error>({
    // Query key includes the debounced term
    queryKey: [...cacheKeys.stores.all, "search", debouncedSearchTerm],
    queryFn: () => {
      // Prepare parameters for the API call
      const params: SearchStoresParams = {
        query: debouncedSearchTerm,
        limit: 15,
      }; // Adjust limit as needed
      return apiClients.stores.searchStores(params).then((res) => res.data);
    },
    // Only run query if client is ready, user is authenticated,
    // and the debounced search term is long enough
    enabled:
      clientsReady &&
      isAuthenticated &&
      !authLoading &&
      debouncedSearchTerm.length >= 2, // Match backend validation
    staleTime: CACHE_TIMES.MEDIUM, // Cache results for a bit
  });
}

// --- New Hook ---

// Hook to lookup multiple stores by their IDs
export function useLookupStores(storeIds: string[]) {
  const { apiClients, clientsReady } = useApiClients();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  // Filter out empty IDs and join for the query key and API call
  const validIds = storeIds.filter((id) => id);
  const idsQueryParam = validIds.join(",");

  return useQuery<StoreBasicInfo[], Error>({
    // Expect an array of StoreBasicInfo
    // Include the sorted list of valid IDs in the query key
    queryKey: cacheKeys.stores.lookup(validIds.sort()),
    queryFn: () =>
      // Pass the comma-separated string of IDs to the API client method
      apiClients.stores
        .lookupStores({ ids: idsQueryParam })
        .then((res) => res.data),
    // Only enable if there are valid IDs and the client is ready
    enabled:
      validIds.length > 0 && isAuthenticated && !authLoading && clientsReady,
    // Cache settings can be specific or default
    staleTime: CACHE_TIMES.LONG, // Store names don't change often
    gcTime: CACHE_TIMES.LONG * 2,
  });
}

export function useDeleteStoreProfile() {
  const { apiClients } = useApiClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiClients.stores.deleteStoreProfile().then((res) => res.data),
    onSuccess: () => {
      // After successful deletion, clear store-related cache
      queryClient.invalidateQueries({ queryKey: ["auth", "metadata"] });
      queryClient.invalidateQueries({ queryKey: ["stores"] });
    },
  });
}
