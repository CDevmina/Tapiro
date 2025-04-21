import { useQuery } from "@tanstack/react-query";
import { useApiClients } from "../apiClient";
import { cacheKeys, CACHE_TIMES } from "../utils/cache";
import { Taxonomy, Error } from "../types/data-contracts";

export function useTaxonomy() {
  // Taxonomy doesn't strictly need auth, but uses the same client setup
  const { apiClients } = useApiClients(); // No clientsReady check needed if endpoint is public

  return useQuery<Taxonomy, Error>({
    // Expect Taxonomy type
    queryKey: cacheKeys.system.taxonomy(),
    queryFn: () =>
      // Use the taxonomy client
      apiClients.taxonomy.getTaxonomyCategories().then((res) => res.data),
    // Taxonomy changes infrequently, use longer cache times
    staleTime: CACHE_TIMES.LONG,
    gcTime: CACHE_TIMES.LONG * 2,
    // enabled: clientsReady, // Only needed if endpoint requires auth
  });
}
