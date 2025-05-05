import { QueryClient } from "@tanstack/react-query";
import {
  User,
  GetRecentUserDataParams,
  GetApiUsageLogParams,
  GetApiKeyUsagePayload,
} from "../types/data-contracts";

// Cache time configurations (in milliseconds)
export const CACHE_TIMES = {
  SHORT: 30 * 1000, // 30 seconds
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 30 * 60 * 1000, // 30 minutes
};

// Create and configure Query Client
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: CACHE_TIMES.MEDIUM,
      gcTime: CACHE_TIMES.MEDIUM * 2,
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

// Cache keys for consistent query identification
export const cacheKeys = {
  users: {
    all: ["users"] as const,
    profile: () => [...cacheKeys.users.all, "profile"] as const,
    preferences: () => [...cacheKeys.users.all, "preferences"] as const,
    storeConsent: () => [...cacheKeys.users.all, "storeConsent"] as const,
    recentData: (params: GetRecentUserDataParams = {}) =>
      [
        ...cacheKeys.users.all,
        "recentData",
        {
          limit: params.limit ?? 10,
          page: params.page ?? 1,
          dataType: params.dataType ?? "all",
          storeId: params.storeId ?? "all",
          startDate: params.startDate ?? "all",
          endDate: params.endDate ?? "all",
          searchTerm: params.searchTerm ?? "",
        },
      ] as const,
    spendingAnalytics: (startDate?: string, endDate?: string) =>
      [
        ...cacheKeys.users.all,
        "spendingAnalytics",
        { startDate: startDate ?? "all", endDate: endDate ?? "all" },
      ] as const,
  },
  stores: {
    all: ["stores"] as const,
    profile: () => [...cacheKeys.stores.all, "profile"] as const,
    apiKeys: () => [...cacheKeys.stores.all, "apiKeys"] as const,
    apiKeyUsage: (params: { keyId: string } & GetApiKeyUsagePayload) =>
      [
        ...cacheKeys.stores.all,
        "apiKeyUsage",
        {
          keyId: params.keyId,
          startDate: params.startDate ?? "all",
          endDate: params.endDate ?? "all",
        },
      ] as const,
    apiUsageLog: (params: GetApiUsageLogParams) =>
      [...cacheKeys.stores.all, "apiUsageLog", params] as const,
    lookup: (ids: string[]) =>
      [...cacheKeys.stores.all, "lookup", ids] as const,
    search: (query: string) =>
      [...cacheKeys.stores.all, "search", query] as const,
  },
  system: {
    all: ["system"] as const,
    health: () => [...cacheKeys.system.all, "health"] as const,
    ping: () => [...cacheKeys.system.all, "ping"] as const,
    taxonomy: () => [...cacheKeys.system.all, "taxonomy"] as const,
  },
};

// Resource-specific cache configurations
export const cacheSettings = {
  user: {
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: CACHE_TIMES.MEDIUM * 2,
  },
  preferences: {
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: CACHE_TIMES.MEDIUM * 2,
  },
  store: {
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: CACHE_TIMES.MEDIUM * 2,
  },
  metadata: {
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: CACHE_TIMES.MEDIUM * 2,
  },
  apiKeys: {
    staleTime: CACHE_TIMES.SHORT,
    gcTime: CACHE_TIMES.SHORT * 2,
  },
  system: {
    staleTime: CACHE_TIMES.SHORT,
    gcTime: CACHE_TIMES.SHORT * 2,
  },
  taxonomy: {
    staleTime: CACHE_TIMES.LONG,
    gcTime: CACHE_TIMES.LONG * 2,
  },
};

// Helper for optimistic updates
export const optimisticUpdates = {
  optInStore: (storeId: string) => {
    queryClient.setQueryData(
      cacheKeys.users.profile(),
      (oldData: User | undefined) => {
        if (!oldData) return oldData;
        const privacySettings = oldData.privacySettings || {
          dataSharingConsent: false,
        };
        const optInStores = [...(privacySettings.optInStores || [])];
        const optOutStores = [...(privacySettings.optOutStores || [])];

        if (!optInStores.includes(storeId)) {
          optInStores.push(storeId);
        }

        const optOutIndex = optOutStores.indexOf(storeId);
        if (optOutIndex >= 0) {
          optOutStores.splice(optOutIndex, 1);
        }

        return {
          ...oldData,
          privacySettings: {
            ...privacySettings,
            optInStores,
            optOutStores,
          },
        };
      },
    );
  },

  optOutStore: (storeId: string) => {
    queryClient.setQueryData(
      cacheKeys.users.profile(),
      (oldData: User | undefined) => {
        if (!oldData) return oldData;

        const privacySettings = oldData.privacySettings || {
          dataSharingConsent: false,
        };
        const optInStores = [...(privacySettings.optInStores || [])];
        const optOutStores = [...(privacySettings.optOutStores || [])];

        const optInIndex = optInStores.indexOf(storeId);
        if (optInIndex >= 0) {
          optInStores.splice(optInIndex, 1);
        }

        if (!optOutStores.includes(storeId)) {
          optOutStores.push(storeId);
        }

        return {
          ...oldData,
          privacySettings: {
            ...privacySettings,
            optInStores,
            optOutStores,
          },
        };
      },
    );
  },
};
