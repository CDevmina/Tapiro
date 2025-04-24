import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClients } from "../apiClient";
import { cacheKeys, cacheSettings, CACHE_TIMES } from "../utils/cache";
import {
  ApiKeyCreate,
  StoreUpdate,
  StoreBasicInfo,
  Error, // <-- Import Error type
  SearchStoresParams, // <-- Import SearchStoresParams if generated
} from "../types/data-contracts";
import { useAuth } from "../../hooks/useAuth";
import { useState, useEffect } from "react"; // <-- Import useState and useEffect for debounce

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

export function useApiKeyUsage(keyId: string) {
  // Get clientsReady state
  const { apiClients, clientsReady } = useApiClients();
  const { isAuthenticated, isLoading: authLoading } = useAuth(); // Get auth state

  return useQuery({
    queryKey: cacheKeys.stores.apiKeyUsage(keyId),
    queryFn: () =>
      apiClients.stores.getApiKeyUsage(keyId).then((res) => res.data),
    // Update enabled check, keeping !!keyId
    enabled: !!keyId && isAuthenticated && !authLoading && clientsReady,
    ...cacheSettings.apiKeys,
  });
}

// --- New Hook for Searching Stores ---
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
