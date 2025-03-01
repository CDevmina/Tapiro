import { AuthStateManager } from "@/auth/AuthStateManager";
import { Outlet } from "react-router-dom";

export const AuthStateWrapper = () => {
  return (
    <AuthStateManager>
      <Outlet />
    </AuthStateManager>
  );
};
