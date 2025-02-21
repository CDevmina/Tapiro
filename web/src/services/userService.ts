import apiClient from "../api/apiClient";
import { useAuth } from "../hooks/useAuth";

interface UserPreferences {
  categories: string[];
  purchase_history: string[];
}

interface UserPrivacySettings {
  data_sharing: boolean;
  anonymized_id?: string; // Optional because it's readonly
}

interface UserUpdateData {
  preferences?: UserPreferences;
  privacy_settings?: UserPrivacySettings;
}

export const useUserService = () => {
  const { getToken } = useAuth();

  const registerUser = async (role: "user" | "store") => {
    const token = await getToken();
    return apiClient.post(
      "/users",
      { role },
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

  return {
    registerUser,
    getUserProfile,
    updateUserProfile,
  };
};
