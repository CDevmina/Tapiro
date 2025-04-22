import { useApiClients } from "../apiClient";
import { useAuth } from "../../hooks/useAuth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserCreate, StoreCreate, User, Store } from "../types/data-contracts";
import { cacheSettings, cacheKeys } from "../utils/cache"; // Import cacheSettings
import { useNavigate } from "react-router";

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
  const { apiClients } = useApiClients();
  const queryClient = useQueryClient();
  const auth = useAuth();
  const navigate = useNavigate();

  return useMutation<User, Error, UserCreate>({
    mutationFn: (userData: UserCreate) =>
      apiClients.users.registerUser(userData).then((res) => res.data),
    onSuccess: async () => {
      // Invalidate metadata and refresh tokens first
      await queryClient.invalidateQueries({ queryKey: ["auth", "metadata"] });
      await auth.refreshTokens();

      // Navigate to user dashboard after token refresh
      navigate("/dashboard/user");

      // Invalidate other queries after navigation is triggered
      await queryClient.invalidateQueries({
        queryKey: cacheKeys.users.profile(),
      });
      await queryClient.invalidateQueries({
        queryKey: cacheKeys.users.preferences(),
      });
    },
  });
}

export function useRegisterStore() {
  const { apiClients } = useApiClients();
  const queryClient = useQueryClient();
  const auth = useAuth();

  return useMutation<Store, Error, StoreCreate>({
    mutationFn: (storeData: StoreCreate) =>
      apiClients.stores.registerStore(storeData).then((res) => res.data),
    onSuccess: async () => {
      // Remove 'data' parameter if not used elsewhere
      // 1. Invalidate metadata
      await queryClient.invalidateQueries({ queryKey: ["auth", "metadata"] });

      // 2. (Removed) Set roles directly in React context state

      // 3. Attempt to refresh the actual tokens in the SDK cache
      await auth.refreshTokens(); // <-- Rely on this

      // 4. Invalidate local API data
      await queryClient.invalidateQueries({
        queryKey: cacheKeys.stores.profile(),
      });
      // Add any other relevant query invalidations here (e.g., apiKeys if applicable)
    },
  });
}
