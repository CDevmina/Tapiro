import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClients } from "../apiClient";
import { cacheKeys, cacheSettings } from "../utils/cache";
import { ApiKeyCreate, StoreUpdate } from "../types/data-contracts";
import { useAuth } from "../../hooks/useAuth"; // Import useAuth

export function useStoreProfile() {
  const { apiClients, isTokenSet } = useApiClients(); // Get isTokenSet
  const { isAuthenticated, isLoading: authLoading } = useAuth(); // Get auth state

  return useQuery({
    queryKey: cacheKeys.stores.profile(),
    queryFn: () => apiClients.stores.getStoreProfile().then((res) => res.data),
    // Add auth and token checks to enabled condition
    enabled: isAuthenticated && !authLoading && isTokenSet,
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
  const { apiClients, isTokenSet } = useApiClients(); // Get isTokenSet
  const { isAuthenticated, isLoading: authLoading } = useAuth(); // Get auth state

  return useQuery({
    queryKey: cacheKeys.stores.apiKeys(),
    queryFn: () => apiClients.stores.getApiKeys().then((res) => res.data),
    // Add auth and token checks to enabled condition
    enabled: isAuthenticated && !authLoading && isTokenSet,
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
  const { apiClients, isTokenSet } = useApiClients(); // Get isTokenSet
  const { isAuthenticated, isLoading: authLoading } = useAuth(); // Get auth state

  return useQuery({
    queryKey: cacheKeys.stores.apiKeyUsage(keyId),
    queryFn: () =>
      apiClients.stores.getApiKeyUsage(keyId).then((res) => res.data),
    // Add auth and token checks to enabled condition, also check keyId exists
    enabled: !!keyId && isAuthenticated && !authLoading && isTokenSet,
    ...cacheSettings.apiKeys,
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
