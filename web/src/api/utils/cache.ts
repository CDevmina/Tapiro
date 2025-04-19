import { QueryClient } from "@tanstack/react-query";
// Import User type instead of UserPreferences
import { User } from "../types/data-contracts"; // #attachment:web/src/api/types/data-contracts.ts

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
    // Add dashboard keys under users
    dashboard: {
      all: () => [...cacheKeys.users.all, "dashboard"],
      usageSummary: () => [...cacheKeys.users.dashboard.all(), "usage-summary"],
      spendingAnalytics: () => [
        ...cacheKeys.users.dashboard.all(),
        "spending-analytics",
      ],
      recentData: (limit?: number) => [
        ...cacheKeys.users.dashboard.all(),
        "recent-data",
        limit ?? "default", // Add limit to key if provided
      ],
      consentingStores: () => [
        ...cacheKeys.users.dashboard.all(),
        "consenting-stores",
      ],
    },
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
  dashboard: {
    // Add settings for dashboard data
    staleTime: CACHE_TIMES.MEDIUM,
    gcTime: CACHE_TIMES.MEDIUM * 2,
  },
};

// Helper for optimistic updates
export const optimisticUpdates = {
  // Update optInStore to target the user profile cache
  optInStore: (storeId: string) => {
    queryClient.setQueryData(
      cacheKeys.users.profile(), // Target profile cache
      (oldData: User | undefined) => {
        // Expect User type
        if (!oldData) return oldData;

        // Access privacySettings directly from User object
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

  // Update optOutStore to target the user profile cache
  optOutStore: (storeId: string) => {
    queryClient.setQueryData(
      cacheKeys.users.profile(), // Target profile cache
      (oldData: User | undefined) => {
        // Expect User type
        if (!oldData) return oldData;

        // Access privacySettings directly from User object
        const privacySettings = oldData.privacySettings || {};
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
