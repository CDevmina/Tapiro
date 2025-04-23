import { useQuery } from "@tanstack/react-query";
import { useApiClients } from "../apiClient";
import { cacheKeys, cacheSettings } from "../utils/cache";
import { HealthStatus, PingStatus, Error } from "../types/data-contracts";

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
