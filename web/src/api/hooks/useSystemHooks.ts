import { useQuery } from "@tanstack/react-query";
import { useApiClients } from "../apiClient";
import { cacheKeys, cacheSettings } from "../utils/cache";
import { HealthStatus, PingStatus, Taxonomy } from "../types/data-contracts"; // <-- Add Taxonomy type

export function useHealthCheck() {
  // Destructure apiClients first, then get health from it
  const { apiClients } = useApiClients();
  const { health } = apiClients; // Now get health client

  // Adjust the useQuery generic to expect HealthStatus as the data type
  return useQuery<HealthStatus, Error>({
    queryKey: cacheKeys.system.health(),
    // Ensure health client exists before calling
    queryFn: () => health.healthCheck().then((res) => res.data),
    ...cacheSettings.system,
  });
}

export function usePing() {
  // Destructure apiClients first, then get ping from it
  const { apiClients } = useApiClients();
  const { ping } = apiClients; // Now get ping client

  // Adjust the useQuery generic to expect PingStatus as the data type
  return useQuery<PingStatus, Error>({
    queryKey: cacheKeys.system.ping(),
    // Ensure ping client exists before calling
    queryFn: () => ping.ping().then((res) => res.data), // queryFn returns PingStatus
    ...cacheSettings.system,
    // Ping doesn't require auth, so no enabled check needed here
  });
}

export function useTaxonomy() {
  // <-- New Hook
  const { apiClients } = useApiClients(); // No auth needed for taxonomy usually

  return useQuery<Taxonomy, Error>({
    // <-- Use specific type
    queryKey: cacheKeys.system.taxonomy(),
    queryFn: () =>
      apiClients.taxonomy.getTaxonomyCategories().then((res) => res.data),
    // Taxonomy is public, so no 'enabled' check based on auth needed
    ...cacheSettings.taxonomy, // <-- Use specific cache settings
  });
}
