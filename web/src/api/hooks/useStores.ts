import { useQuery, useMutation } from "@tanstack/react-query";
// Remove unused axios import: import axios from "axios";
import { useAuth } from "../../hooks/useAuth";
// Import from the swagger-codegen output
import {
  StoreManagementApi,
  Configuration,
  Store,
  ApiKeyList,
  ApiKeyCreate,
  ApiKeyUsage, // Keep if you plan to implement usage hook
  BaseAPI,
} from "../client";
import { cacheKeys, cacheSettings, queryClient } from "../utils/cache";

// Note: setAuthToken and the 'api' object from client.ts are no longer needed
// Note: Type aliases using 'components' from '../types' are no longer needed

export const useStores = () => {
  const auth = useAuth();

  // Helper to create configured API instances (can be shared)
  const createApiInstance = async <T extends BaseAPI>(
    ApiClass: new (config: Configuration) => T,
  ): Promise<T> => {
    const token = await auth.getAccessToken();
    const config = new Configuration({
      accessToken: token ? `Bearer ${token}` : undefined,
      // basePath: import.meta.env.VITE_API_URL,
    });
    return new ApiClass(config);
  };

  // Get store profile for authenticated store
  const useStoreProfile = () => {
    return useQuery<Store>({
      // Use Store type from swagger/api.ts
      queryKey: cacheKeys.stores.profile(),
      queryFn: async () => {
        const storeApi = await createApiInstance(StoreManagementApi);
        const profile = await storeApi.getStoreProfile({});
        return profile;
      },
      ...cacheSettings.store,
      enabled: auth.isAuthenticated,
    });
  };

  // Get store's API keys
  const useApiKeys = () => {
    return useQuery<ApiKeyList>({
      // Use ApiKeyList type from swagger/api.ts
      queryKey: cacheKeys.stores.apiKeys(),
      queryFn: async () => {
        const storeApi = await createApiInstance(StoreManagementApi);
        const keys = await storeApi.getApiKeys({});
        return keys;
      },
      ...cacheSettings.apiKeys,
      enabled: auth.isAuthenticated,
    });
  };

  // Create a new API key
  const useCreateApiKey = () => {
    return useMutation({
      // Use ApiKeyCreate type from swagger/api.ts
      mutationFn: async (keyData: ApiKeyCreate) => {
        const storeApi = await createApiInstance(StoreManagementApi);
        // Pass body directly as first argument
        const newKey = await storeApi.createApiKey(keyData, {});
        return newKey; // Assuming it returns the created key
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: cacheKeys.stores.apiKeys() });
      },
      // Consider adding onError
    });
  };

  // --- Placeholder for Get API Key Usage ---
  // const useApiKeyUsage = (keyId: string, dateRange?: KeyIdUsageBody) => {
  //   return useQuery<ApiKeyUsage>({
  //     queryKey: cacheKeys.stores.apiKeyUsage(keyId),
  //     queryFn: async () => {
  //       const storeApi = await createApiInstance(StoreManagementApi);
  //       // Note: getApiKeyUsage expects keyId and body as separate args
  //       const usage = await storeApi.getApiKeyUsage(keyId, dateRange, {});
  //       return usage;
  //     },
  //     enabled: auth.isAuthenticated && !!keyId,
  //     // Add appropriate cache settings if needed
  //   });
  // };

  // Additional store hooks...

  return {
    useStoreProfile,
    useApiKeys,
    useCreateApiKey,
    // useApiKeyUsage, // Uncomment when implemented
    // Include other hooks...
  };
};
