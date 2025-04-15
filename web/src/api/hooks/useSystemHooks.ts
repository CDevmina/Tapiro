import { useQuery } from "@tanstack/react-query";
import { useApiClients } from "../apiClient";
import { cacheKeys, cacheSettings } from "../utils/cache";

export function useHealthCheck() {
  const { health } = useApiClients();

  return useQuery({
    queryKey: cacheKeys.system.health(),
    queryFn: () => health.healthCheck().then((res) => res.data),
    ...cacheSettings.system,
  });
}

export function usePing() {
  const { ping } = useApiClients();

  return useQuery({
    queryKey: cacheKeys.system.ping(),
    queryFn: () => ping.ping().then((res) => res.data),
    ...cacheSettings.system,
  });
}
