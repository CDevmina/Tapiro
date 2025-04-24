import { QueryClient } from "@tanstack/react-query";
// Import GetRecentUserDataParams if not already imported
import {
  User,
  GetRecentUserDataParams,
  GetApiUsageLogParams, // <-- Add this import
  GetApiKeyUsagePayload, // <-- Import payload type
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
      staleTime: CACHE_TIMES.MEDIUM, // Default stale time
      gcTime: CACHE_TIMES.MEDIUM * 2, // Default cache time
      retry: 1, // Retry failed queries once
      refetchOnWindowFocus: true, // Refetch when window regains focus
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
    // Pass params object for recent data
    recentData: (params: GetRecentUserDataParams = {}) =>
      [
        ...cacheKeys.users.all,
        "recentData",
        // Create a stable object key based on params
        {
          limit: params.limit ?? 10, // Default limit
          page: params.page ?? 1, // Default page
          dataType: params.dataType ?? "all",
          storeId: params.storeId ?? "all",
          startDate: params.startDate ?? "all",
          endDate: params.endDate ?? "all",
          searchTerm: params.searchTerm ?? "",
        },
      ] as const,
    // Pass dates for spending analytics
    spendingAnalytics: (startDate?: string, endDate?: string) =>
      [
        ...cacheKeys.users.all,
        "spendingAnalytics",
        { startDate: startDate ?? "all", endDate: endDate ?? "all" }, // Use 'all' if undefined
      ] as const,
  },
  stores: {
    all: ["stores"] as const,
    profile: () => [...cacheKeys.stores.all, "profile"] as const,
    apiKeys: () => [...cacheKeys.stores.all, "apiKeys"] as const,
    // Update apiKeyUsage to accept an object with keyId and optional dates
    apiKeyUsage: (
      params: { keyId: string } & GetApiKeyUsagePayload, // <-- Accept object
    ) =>
      [
        ...cacheKeys.stores.all,
        "apiKeyUsage",
        // Create a stable object key
        {
          keyId: params.keyId,
          startDate: params.startDate ?? "all",
          endDate: params.endDate ?? "all",
        },
      ] as const,
    // Add key for API usage log, accepting filter params
    apiUsageLog: (params: GetApiUsageLogParams) =>
      [
        // <-- New Key
        ...cacheKeys.stores.all,
        "apiUsageLog",
        params,
      ] as const,
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
    staleTime: CACHE_TIMES.MEDIUM, // Consider fresh for 5 mins
    gcTime: CACHE_TIMES.MEDIUM * 2, // Keep in cache for 10 mins after inactive
  },
  apiKeys: {
    staleTime: CACHE_TIMES.SHORT, // More frequent updates for security
    gcTime: CACHE_TIMES.SHORT * 2,
  },
  system: {
    staleTime: CACHE_TIMES.SHORT,
    gcTime: CACHE_TIMES.SHORT * 2,
  },
  taxonomy: {
    // <-- Add specific settings for taxonomy (cache longer)
    staleTime: CACHE_TIMES.LONG,
    gcTime: CACHE_TIMES.LONG * 2,
  },
};

// Helper for optimistic updates
export const optimisticUpdates = {
  // Add a store to opt-in list and remove from opt-out list within the User profile cache
  optInStore: (storeId: string) => {
    queryClient.setQueryData(
      cacheKeys.users.profile(),
      (oldData: User | undefined) => {
        if (!oldData) return oldData;
        // Ensure privacySettings exists, initialize if not
        const privacySettings = oldData.privacySettings || {
          dataSharingConsent: false,
        }; // Default consent if needed
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

  // Remove store from opt-in list and add to opt-out list within the User profile cache
  optOutStore: (storeId: string) => {
    queryClient.setQueryData(
      cacheKeys.users.profile(), // <--- Target user profile cache
      (oldData: User | undefined) => {
        // <--- Use User type
        if (!oldData) return oldData;

        // Ensure privacySettings exists, initialize if not
        const privacySettings = oldData.privacySettings || {
          dataSharingConsent: false,
        }; // Default consent if needed
        const optInStores = [...(privacySettings.optInStores || [])];
        const optOutStores = [...(privacySettings.optOutStores || [])];

        // Remove from opt-in list if present
        const optInIndex = optInStores.indexOf(storeId);
        if (optInIndex >= 0) {
          optInStores.splice(optInIndex, 1);
        }

        // Add to opt-out list if not already there
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
