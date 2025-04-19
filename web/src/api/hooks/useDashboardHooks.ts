import { useQuery } from "@tanstack/react-query";
import { useApiClients } from "../apiClient"; // #attachment:apiClient.ts
import { cacheKeys, cacheSettings } from "../utils/cache"; // #attachment:cache.ts
import { useAuth } from "../../hooks/useAuth"; // #attachment:useAuthHooks.ts uses useAuth

// Hook to fetch the usage summary
export function useUsageSummary() {
  const { apiClients, clientsReady } = useApiClients();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  return useQuery({
    queryKey: cacheKeys.users.dashboard.usageSummary(),
    queryFn: () => apiClients.users.getUsageSummary().then((res) => res.data), // #attachment:web/src/api/types/Users.ts
    enabled: isAuthenticated && !authLoading && clientsReady,
    ...cacheSettings.dashboard, // Use dashboard-specific cache settings
  });
}

// Hook to fetch spending analytics
export function useSpendingAnalytics() {
  const { apiClients, clientsReady } = useApiClients();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  return useQuery({
    queryKey: cacheKeys.users.dashboard.spendingAnalytics(),
    queryFn: () =>
      apiClients.users.getSpendingAnalytics().then((res) => res.data), // #attachment:web/src/api/types/Users.ts
    enabled: isAuthenticated && !authLoading && clientsReady,
    ...cacheSettings.dashboard,
  });
}

// Hook to fetch recent data entries
export function useRecentData(limit?: number) {
  const { apiClients, clientsReady } = useApiClients();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  return useQuery({
    queryKey: cacheKeys.users.dashboard.recentData(limit),
    queryFn: () =>
      apiClients.users.getRecentData({ limit }).then((res) => res.data), // #attachment:web/src/api/types/Users.ts
    enabled: isAuthenticated && !authLoading && clientsReady,
    ...cacheSettings.dashboard,
    // Keep data fresh for a shorter time if desired, or use default dashboard settings
  });
}

// Hook to fetch consenting stores
export function useConsentingStores() {
  const { apiClients, clientsReady } = useApiClients();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  return useQuery({
    queryKey: cacheKeys.users.dashboard.consentingStores(),
    queryFn: () =>
      apiClients.users.getConsentingStores().then((res) => res.data), // #attachment:openapi.yaml
    enabled: isAuthenticated && !authLoading && clientsReady,
    ...cacheSettings.dashboard,
  });
}
