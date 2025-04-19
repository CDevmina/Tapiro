// filepath: /Users/cdevmina/Projects/Tapiro/web/src/components/auth/RegistrationGuard.tsx
import React from "react";
import { useAuth } from "../../hooks/useAuth";
import { useRegistrationStatus } from "../../hooks/useRegistrationStatus";
import LoadingSpinner from "../common/LoadingSpinner";
import { RegistrationCompletionModal } from "./RegistrationCompletionModal";

interface RegistrationGuardProps {
  children: React.ReactNode;
}

export const RegistrationGuard: React.FC<RegistrationGuardProps> = ({
  children,
}) => {
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const {
    isLoading: registrationLoading,
    shouldShowRegistration,
    isComplete: registrationIsComplete, // Get completion status
  } = useRegistrationStatus();

  // Show loading spinner while checking auth or registration status
  if (authLoading || (isAuthenticated && registrationLoading)) {
    // Only show registration loading if authenticated
    return (
      <div className="flex h-screen items-center justify-center">
        <LoadingSpinner message="Checking registration status…" />
      </div>
    );
  }

  // If authenticated but registration is needed, show the modal
  // Ensure we don't show modal if registration is already complete but status hook might be lagging
  if (isAuthenticated && shouldShowRegistration && !registrationIsComplete) {
    return <RegistrationCompletionModal />;
  }

  // Otherwise, render the actual page content
  return <>{children}</>;
};
