import { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useUserMetadata } from "../api/hooks/useAuthHooks";

export function useRegistrationStatus() {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth0();
  const { data: metadata, isLoading: isMetadataLoading } = useUserMetadata();
  const [registrationStatus, setRegistrationStatus] = useState({
    isComplete: false,
    type: null as "user" | "store" | null,
    shouldShowRegistration: false,
  });

  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && !isMetadataLoading) {
      const isComplete = metadata?.metadata?.registrationComplete || false;
      const type = metadata?.metadata?.registrationType as
        | "user"
        | "store"
        | null;
      const shouldShowRegistration = isAuthenticated && !isComplete;

      setRegistrationStatus({
        isComplete,
        type,
        shouldShowRegistration,
      });
    }
  }, [isAuthenticated, isAuthLoading, metadata, isMetadataLoading]);

  return registrationStatus;
}
