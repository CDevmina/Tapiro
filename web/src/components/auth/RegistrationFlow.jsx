import { useState, useEffect } from "react";
// import { Navigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { useAuthApi } from "../../api";
import { Spinner, Button } from "../common";

// Step components
import UserTypeSelection from "./registration/UserTypeSelection";
import UserRegistrationForm from "./registration/UserRegistrationForm";
import StoreRegistrationForm from "./registration/StoreRegistrationForm";

export function RegistrationFlow() {
  const { user, isLoading } = useAuth();
  const { updateAuthMetadata } = useAuthApi();

  // Registration flow state
  const [step, setStep] = useState("type-selection");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Handle user type selection
  const handleUserTypeSelect = async (type) => {
    setError(null);

    try {
      setIsSubmitting(true);
      // Update metadata with type, but mark as incomplete
      await updateAuthMetadata({
        registrationType: type,
        registrationComplete: false,
      });

      // Move to appropriate registration form
      setStep(type === "user" ? "user-form" : "store-form");
    } catch (err) {
      setError("Failed to save your selection. Please try again. Error:" + err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Spinner size="xl" />
        <p className="mt-4 text-gray-600">Loading your profile...</p>
      </div>
    );
  }

  // Show registration steps
  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-semibold mb-6 text-center">
        Complete Your Registration
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {step === "type-selection" && (
        <UserTypeSelection
          onSelect={handleUserTypeSelect}
          isSubmitting={isSubmitting}
        />
      )}

      {step === "user-form" && (
        <UserRegistrationForm
          user={user}
          setStep={setStep}
          setError={setError}
        />
      )}

      {step === "store-form" && (
        <StoreRegistrationForm
          user={user}
          setStep={setStep}
          setError={setError}
        />
      )}
    </div>
  );
}
