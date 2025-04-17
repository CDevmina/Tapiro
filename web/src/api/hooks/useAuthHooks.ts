import { useApiClients } from "../apiClient";
import { useAuth } from "../../hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  UserMetadataUpdate,
  UserCreate,
  StoreCreate,
} from "../types/data-contracts";
import { cacheSettings } from "../utils/cache"; // Import cacheSettings

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

export function useUpdateUserMetadata() {
  const { apiClients } = useApiClients(); // Only need clients here
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (metadata: UserMetadataUpdate) =>
      apiClients.users.updateUserMetadata(metadata).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "metadata"] });
    },
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
    },
  });
}
