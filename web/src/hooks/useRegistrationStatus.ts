import { useEffect, useState } from "react";
import { useAuth } from "../hooks/useAuth";
import { useUserMetadata } from "../api/hooks/useAuthHooks";

export function useRegistrationStatus() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { data: metadata, isLoading: isMetadataLoading } = useUserMetadata();
  const [registrationStatus, setRegistrationStatus] = useState({
    isComplete: false,
    type: null as "user" | "store" | null,
    shouldShowRegistration: false,
    isLoading: true, // Add loading state to track initial load
  });

  useEffect(() => {
    // If either auth or metadata is still loading, mark the overall status as loading
    if (authLoading || isMetadataLoading) {
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
    const shouldShowRegistration =
      isAuthenticated && !authLoading && !isComplete;

    setRegistrationStatus({
      isComplete,
      type,
      shouldShowRegistration,
      isLoading: false, // We're done loading
    });
  }, [isAuthenticated, authLoading, metadata, isMetadataLoading]);

  return registrationStatus;
}
