import apiClient from "../api/apiClient";

// User registration request
interface UserCreate {
  username: string;
  name?: string;
  preferences?: string[];
  dataSharingConsent: boolean;
}

// Store registration request
interface StoreCreate {
  name: string;
  bussinessType: string;
  address: string;
  dataSharingConsent?: boolean;
  webhooks?: {
    url: string;
    events: Array<"purchase" | "opt-out">;
  }[];
}

// User update request
interface UserUpdate {
  name?: string;
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
  name?: string;
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
  phone?: string;
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
  // User registration
  const registerUser = async (userData: UserCreate) => {
    return apiClient.post<User>("/users/register", userData);
  };

  // Store registration
  const registerStore = async (storeData: StoreCreate) => {
    return apiClient.post<Store>("/stores/register", storeData);
  };

  // User profile operations
  const getUserProfile = async () => {
    return apiClient.get<User>("/users/profile");
  };

  const updateUserProfile = async (data: UserUpdate) => {
    return apiClient.put<User>("/users/profile", data);
  };

  const deleteUserProfile = async () => {
    return apiClient.delete("/users/profile");
  };

  // Store profile operations
  const getStoreProfile = async () => {
    return apiClient.get<Store>("/stores/profile");
  };

  const updateStoreProfile = async (data: StoreUpdate) => {
    return apiClient.put<Store>("/stores/profile", data);
  };

  const deleteStoreProfile = async () => {
    return apiClient.delete("/stores/profile");
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
