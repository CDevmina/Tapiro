import { QueryClient } from "@tanstack/react-query";
import { UserPreferences } from "../types/data-contracts";

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
    all: ["users"],
    profile: () => [...cacheKeys.users.all, "profile"],
    preferences: () => [...cacheKeys.users.all, "preferences"],
  },
  stores: {
    all: ["stores"],
    profile: () => [...cacheKeys.stores.all, "profile"],
    apiKeys: () => [...cacheKeys.stores.all, "apiKeys"],
    apiKeyUsage: (keyId: string) => [
      ...cacheKeys.stores.apiKeys(),
      keyId,
      "usage",
    ],
  },
  system: {
    health: () => ["system", "health"],
    ping: () => ["system", "ping"],
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
  apiKeys: {
    staleTime: CACHE_TIMES.SHORT,
    gcTime: CACHE_TIMES.SHORT * 2,
  },
  system: {
    staleTime: CACHE_TIMES.SHORT,
    gcTime: CACHE_TIMES.SHORT * 2,
  },
};

// Helper for optimistic updates
export const optimisticUpdates = {
  // Add a store to opt-in list and remove from opt-out list
  optInStore: (storeId: string) => {
    queryClient.setQueryData(
      cacheKeys.users.preferences(),
      (oldData: UserPreferences | undefined) => {
        // Use standard UserPreferences type
        if (!oldData) return oldData;

        const privacySettings = oldData.privacySettings || {};
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

  // New optOutStore function with mirrored logic
  optOutStore: (storeId: string) => {
    queryClient.setQueryData(
      cacheKeys.users.preferences(),
      (oldData: UserPreferences | undefined) => {
        // Use standard UserPreferences type
        if (!oldData) return oldData;

        const privacySettings = oldData.privacySettings || {};
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
