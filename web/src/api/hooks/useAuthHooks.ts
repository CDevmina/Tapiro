import { useApiClients } from "../apiClient";
import { useMutation, useQueryClient } from "@tanstack/react-query"; // Removed useQuery
import { UserCreate, StoreCreate } from "../types/data-contracts";
import { cacheKeys } from "../utils/cache"; // Removed cacheSettings if only used by useUserMetadata

export function useRegisterUser() {
  const { apiClients } = useApiClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: UserCreate) =>
      apiClients.users.registerUser(userData).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.users.profile() });
      queryClient.invalidateQueries({
        queryKey: cacheKeys.users.preferences(),
      });
    },
  });
}

export function useRegisterStore() {
  const { apiClients } = useApiClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storeData: StoreCreate) =>
      apiClients.stores.registerStore(storeData).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: cacheKeys.stores.profile() });
    },
  });
}
