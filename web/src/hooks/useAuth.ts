import { useContext } from "react";
import { AuthContext } from "../context/AuthContextType";

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProviderWrapper");
  }

  return context;
};
