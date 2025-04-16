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
    isLoading: true, // Add loading state to track initial load
  });

  useEffect(() => {
    // If either auth or metadata is still loading, mark the overall status as loading
    if (isAuthLoading || isMetadataLoading) {
      setRegistrationStatus((prev) => ({ ...prev, isLoading: true }));
      return;
    }

    // Only when both auth and metadata loading are complete, determine if registration is needed
    const isComplete = metadata?.metadata?.registrationComplete || false;
    const type = metadata?.metadata?.registrationType as
      | "user"
      | "store"
      | null;
    // Only show registration when authenticated AND registration is confirmed incomplete
    const shouldShowRegistration = isAuthenticated && !isComplete;

    setRegistrationStatus({
      isComplete,
      type,
      shouldShowRegistration,
      isLoading: false, // We're done loading
    });
  }, [isAuthenticated, isAuthLoading, metadata, isMetadataLoading]);

  return registrationStatus;
}
