import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useApiClients } from "../apiClient";
import { UserMetadataUpdate } from "../types/data-contracts";

export function useUserMetadata() {
  const { users } = useApiClients();

  return useQuery({
    queryKey: ["auth", "metadata"],
    queryFn: () => users.getUserMetadata().then((res) => res.data),
  });
}

export function useUpdateUserMetadata() {
  const { users } = useApiClients();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (metadata: UserMetadataUpdate) =>
      users.updateUserMetadata(metadata).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["auth", "metadata"] });
    },
  });
}
