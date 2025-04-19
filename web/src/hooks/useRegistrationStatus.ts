import { useEffect, useState } from "react";
import { useAuth } from "./useAuth";
import { useUserMetadata } from "../api/hooks/useAuthHooks";

type Status = {
  isComplete: boolean;
  type: "user" | "store" | null;
  shouldShowRegistration: boolean;
  isLoading: boolean;
};

export function useRegistrationStatus(): Status {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    data: metadata,
    isLoading: metaLoading,
    isFetched, // ← new
  } = useUserMetadata();

  const [state, setState] = useState<Status>({
    isComplete: false,
    type: null,
    shouldShowRegistration: false,
    isLoading: true,
  });

  useEffect(() => {
    // still waiting for Auth0 or for metadata to actually come back?
    if (authLoading || metaLoading || !isFetched) {
      setState((s) => ({ ...s, isLoading: true }));
      return;
    }

    // now we really have metadata
    const isComplete = !!metadata?.metadata?.registrationComplete;
    const type = metadata?.metadata?.registrationType as
      | "user"
      | "store"
      | null;
    const shouldShow = isAuthenticated && !isComplete;

    setState({
      isComplete,
      type,
      shouldShowRegistration: shouldShow,
      isLoading: false,
    });
  }, [authLoading, metaLoading, isFetched, isAuthenticated, metadata]);

  return state;
}
