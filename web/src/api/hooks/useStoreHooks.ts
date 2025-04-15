import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClients } from "../apiClient";
import { cacheKeys, cacheSettings } from "../utils/cache";
import { ApiKeyCreate, StoreUpdate } from "../types/data-contracts";

export function useStoreProfile() {
  const { stores } = useApiClients();

  return useQuery({
    queryKey: cacheKeys.stores.profile(),
    queryFn: () => stores.getStoreProfile().then((res) => res.data),
    ...cacheSettings.store,
  });
}

export function useUpdateStoreProfile() {
  const { stores } = useApiClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storeData: StoreUpdate) =>
      stores.updateStoreProfile(storeData).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.stores.profile() });
    },
  });
}

export function useApiKeys() {
  const { stores } = useApiClients();

  return useQuery({
    queryKey: cacheKeys.stores.apiKeys(),
    queryFn: () => stores.getApiKeys().then((res) => res.data),
    ...cacheSettings.apiKeys,
  });
}

export function useCreateApiKey() {
  const { stores } = useApiClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keyData?: ApiKeyCreate) =>
      stores.createApiKey(keyData).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.stores.apiKeys() });
    },
  });
}

export function useRevokeApiKey() {
  const { stores } = useApiClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keyId: string) =>
      stores.revokeApiKey(keyId).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.stores.apiKeys() });
    },
  });
}

export function useApiKeyUsage(keyId: string) {
  const { stores } = useApiClients();

  return useQuery({
    queryKey: cacheKeys.stores.apiKeyUsage(keyId),
    queryFn: () => stores.getApiKeyUsage(keyId).then((res) => res.data),
    ...cacheSettings.apiKeys,
  });
}

// Additional store-related hooks...
