import { useApiClients } from "../apiClient";
import { useAuth } from "../../hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserCreate, StoreCreate } from "../types/data-contracts";
import { cacheSettings, cacheKeys } from "../utils/cache"; // Import cacheSettings

export function useUserMetadata() {
  // Get clientsReady state along with apiClients
  const { apiClients, clientsReady } = useApiClients();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  return useQuery({
    queryKey: ["auth", "metadata"],
    queryFn: () => apiClients.users.getUserMetadata().then((res) => res.data),
    // Update enabled check to include clientsReady
    enabled: isAuthenticated && !authLoading && clientsReady,
    ...cacheSettings.metadata, // Apply specific cache settings
  });
}

export function useRegisterUser() {
  const { apiClients } = useApiClients(); // Only need clients here
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (userData: UserCreate) =>
      apiClients.users.registerUser(userData).then((res) => res.data),
    onSuccess: () => {
      // After successful registration, refresh metadata
      queryClient.invalidateQueries({ queryKey: ["auth", "metadata"] });
      // --- Start Changes ---
      // Also invalidate user profile/preferences if registration affects them
      queryClient.invalidateQueries({ queryKey: cacheKeys.users.profile() });
      queryClient.invalidateQueries({
        queryKey: cacheKeys.users.preferences(),
      });
      // --- End Changes ---
    },
  });
}

export function useRegisterStore() {
  const { apiClients } = useApiClients(); // Only need clients here
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (storeData: StoreCreate) =>
      apiClients.stores.registerStore(storeData).then((res) => res.data),
    onSuccess: () => {
      // After successful registration, refresh metadata
      queryClient.invalidateQueries({ queryKey: ["auth", "metadata"] });
      // --- Start Changes ---
      // Also invalidate store profile if registration affects it
      queryClient.invalidateQueries({ queryKey: cacheKeys.stores.profile() });
      // --- End Changes ---
    },
  });
}
