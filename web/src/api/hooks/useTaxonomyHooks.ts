import { useQuery } from "@tanstack/react-query";
import { useApiClients } from "../apiClient";
import { cacheKeys, cacheSettings } from "../utils/cache";
import { Taxonomy, Error } from "../types/data-contracts";

// Define an interface for the actual API response structure
interface TaxonomyApiResponse {
  _id: string;
  version: string;
  current: boolean;
  data: Taxonomy; // The nested object matching the Taxonomy type
  updated_at: string;
}

export function useTaxonomy() {
  const { apiClients, clientsReady } = useApiClients();

  // The useQuery hook should return the inner 'Taxonomy' type
  return useQuery<Taxonomy, Error>({
    queryKey: cacheKeys.system.taxonomy(),
    queryFn: async () => {
      // Fetch the full response
      const res = await apiClients.taxonomy.getTaxonomyCategories();
      // Explicitly cast the response data to the actual API structure
      const responseData = res.data as unknown as TaxonomyApiResponse;
      // Return the nested 'data' property which matches the 'Taxonomy' type
      return responseData.data;
    },
    enabled: clientsReady, // Only fetch when API client is ready
    ...cacheSettings.taxonomy, // Use specific cache settings
  });
}
