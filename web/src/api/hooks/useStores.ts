import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useAuth } from "../../hooks/useAuth";
import { api, setAuthToken } from "../client";
import { cacheKeys, cacheSettings, queryClient } from "../utils/cache";
import { components } from "../types";

type Store = components["schemas"]["Store"];
type ApiKeyList = components["schemas"]["ApiKeyList"];
type ApiKeyCreate = components["schemas"]["ApiKeyCreate"];
type ApiKeyUsage = components["schemas"]["ApiKeyUsage"];

export const useStores = () => {
  const auth = useAuth();

  // Helper to set up auth for each request
  const setupAuth = async () => {
    const token = await auth.getAccessToken();
    if (token) {
      setAuthToken(token);
    }
    return token;
  };

  // Get store profile for authenticated store
  const useStoreProfile = () => {
    return useQuery<Store>({
      queryKey: cacheKeys.stores.profile(),
      queryFn: async () => {
        await setupAuth();
        const response = await api.stores.getProfile({});
        return response.data;
      },
      ...cacheSettings.store,
      enabled: auth.isAuthenticated,
    });
  };

  // Get store's API keys
  const useApiKeys = () => {
    return useQuery<ApiKeyList>({
      queryKey: cacheKeys.stores.apiKeys(),
      queryFn: async () => {
        await setupAuth();
        const response = await api.stores.getApiKeys({});
        return response.data;
      },
      ...cacheSettings.apiKeys,
      enabled: auth.isAuthenticated,
    });
  };

  // Create a new API key
  const useCreateApiKey = () => {
    return useMutation({
      mutationFn: async (keyData: ApiKeyCreate) => {
        await setupAuth();
        const response = await api.stores.createApiKey({ body: keyData });
        return response.data;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: cacheKeys.stores.apiKeys() });
      },
    });
  };

  // Additional store hooks...

  return {
    useStoreProfile,
    useApiKeys,
    useCreateApiKey,
    // Include other hooks...
  };
};
