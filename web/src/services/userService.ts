import apiClient from "../api/apiClient";
import { useAuth } from "../hooks/useAuth";

interface UserPreferences {
  categories: string[];
  purchase_history: string[];
}

interface UserPrivacySettings {
  data_sharing: boolean;
  anonymized_id?: string;
}

interface UserUpdateData {
  preferences?: UserPreferences;
  privacy_settings?: UserPrivacySettings;
}

interface RegisterUserParams {
  role: "user" | "store";
  data_sharing: boolean;
}

export const useUserService = () => {
  const { getToken } = useAuth();

  const registerUser = async ({ role, data_sharing }: RegisterUserParams) => {
    const token = await getToken();
    return apiClient.post(
      "/users",
      { role, data_sharing },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  };

  const getUserProfile = async () => {
    const token = await getToken();
    return apiClient.get("/users/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const updateUserProfile = async (data: UserUpdateData) => {
    const token = await getToken();
    return apiClient.put("/users/profile", data, {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const deleteUserProfile = async () => {
    const token = await getToken();
    return apiClient.delete("/users/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  return {
    registerUser,
    getUserProfile,
    updateUserProfile,
    deleteUserProfile,
  };
};
