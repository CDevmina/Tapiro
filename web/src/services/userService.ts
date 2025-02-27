import apiClient from "../api/apiClient";
import { useAuth } from "../hooks/useAuth";

// User registration request
interface UserCreate {
  phone?: string;
  preferences?: string[];
  dataSharingConsent: boolean;
}

// Store registration request
interface StoreCreate {
  name: string;
  address: string;
  webhooks?: {
    url: string;
    events: Array<"purchase" | "opt-out">;
  }[];
}

// User update request
interface UserUpdate {
  preferences?: string[];
  privacySettings?: {
    dataSharingConsent?: boolean;
    anonymizeData?: boolean;
    optOutStores?: string[];
  };
  dataAccess?: {
    allowedDomains?: string[];
  };
}

// Store update request
interface StoreUpdate {
  name?: string;
  address?: string;
  webhooks?: {
    url: string;
    events: Array<"purchase" | "opt-out">;
  }[];
}

// Response interfaces
interface User {
  userId?: string;
  auth0Id: string;
  email: string;
  username?: string;
  phone?: string;
  preferences?: string[];
  privacySettings?: {
    dataSharingConsent: boolean;
    anonymizeData: boolean;
    optOutStores: string[];
  };
  createdAt?: string;
  updatedAt?: string;
}

interface Store {
  storeId?: string;
  auth0Id: string;
  name: string;
  address: string;
  apiKeys?: string[];
  webhooks?: {
    url: string;
    events: Array<"purchase" | "opt-out">;
  }[];
  createdAt?: string;
  updatedAt?: string;
}

export const useUserService = () => {
  const { getToken } = useAuth();

  // User registration
  const registerUser = async (userData: UserCreate) => {
    const token = await getToken();
    return apiClient.post<User>("/users/register", userData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  // Store registration
  const registerStore = async (storeData: StoreCreate) => {
    const token = await getToken();
    return apiClient.post<Store>("/stores/register", storeData, {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  // User profile operations
  const getUserProfile = async () => {
    const token = await getToken();
    return apiClient.get<User>("/users/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const updateUserProfile = async (data: UserUpdate) => {
    const token = await getToken();
    return apiClient.put<User>("/users/profile", data, {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const deleteUserProfile = async () => {
    const token = await getToken();
    return apiClient.delete("/users/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  // Store profile operations
  const getStoreProfile = async () => {
    const token = await getToken();
    return apiClient.get<Store>("/stores/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const updateStoreProfile = async (data: StoreUpdate) => {
    const token = await getToken();
    return apiClient.put<Store>("/stores/profile", data, {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  const deleteStoreProfile = async () => {
    const token = await getToken();
    return apiClient.delete("/stores/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  return {
    registerUser,
    registerStore,
    getUserProfile,
    updateUserProfile,
    deleteUserProfile,
    getStoreProfile,
    updateStoreProfile,
    deleteStoreProfile,
  };
};
