import { useState } from "react";
import { Card } from "flowbite-react";
import { RegistrationTypeSelector } from "../components/auth/RegistrationTypeSelector"; // #RegistrationTypeSelector.tsx
import { UserRegistrationForm } from "../components/auth/UserRegistrationForm"; // #UserRegistrationForm.tsx
import { StoreRegistrationForm } from "../components/auth/StoreRegistrationForm"; // #StoreRegistrationForm.tsx
import { RegistrationProgress } from "../components/auth/RegistrationProgress"; // #RegistrationProgress.tsx
import { UserCreate, StoreCreate } from "../api/types/data-contracts";
import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router";

type RegistrationType = "user" | "store";

export default function RegistrationPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const [step, setStep] = useState(1);
  const [registrationType, setRegistrationType] =
    useState<RegistrationType | null>(null);

  const totalSteps = 2; // 1: Type selection, 2: Form details

  const handleTypeSelected = (type: RegistrationType) => {
    setRegistrationType(type);
    setStep(2);
  };

  const handleFormSubmit = (formData: UserCreate | StoreCreate) => {
    if (!registrationType) return; // Should not happen

    // Store data in sessionStorage before redirecting to Auth0
    const registrationData = { type: registrationType, data: formData };
    try {
      sessionStorage.setItem(
        "registrationData",
        JSON.stringify(registrationData),
      );
      console.log("Registration data stored in sessionStorage");

      // Initiate Auth0 login/signup, passing state to redirect to completion page
      login({
        appState: { isRegistering: true, returnTo: "/complete-registration" },
        screen_hint: "signup", // Suggest the signup screen in Auth0
      });
    } catch (error) {
      console.error("Failed to save registration data or redirect:", error);
      // TODO: Handle storage error (e.g., show message to user)
    }
  };

  const handleBack = () => {
    setStep(1);
    setRegistrationType(null);
  };

  // If user is already authenticated, redirect them away from registration
  if (!isLoading && isAuthenticated) {
    // Redirect to a default logged-in page, e.g., dashboard home
    // You might want to check roles here too for specific dashboards
    return <Navigate to="/dashboard/user" replace />; // Or appropriate dashboard
  }

  return (
    <div className="container mx-auto flex min-h-[calc(100vh-200px)] items-center justify-center px-4 py-12">
      <Card className="w-full max-w-lg">
        <RegistrationProgress step={step} totalSteps={totalSteps} />

        {step === 1 && (
          <RegistrationTypeSelector onTypeSelected={handleTypeSelected} />
        )}

        {step === 2 && registrationType === "user" && (
          <>
            <button
              onClick={handleBack}
              className="mb-4 text-sm text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
            >
              &larr; Back to type selection
            </button>
            {/* Pass handleFormSubmit, isLoading can be false as API call happens later */}
            <UserRegistrationForm
              onSubmit={handleFormSubmit}
              isLoading={false}
            />
          </>
        )}

        {step === 2 && registrationType === "store" && (
          <>
            <button
              onClick={handleBack}
              className="mb-4 text-sm text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
            >
              &larr; Back to type selection
            </button>
            {/* Pass handleFormSubmit, isLoading can be false */}
            <StoreRegistrationForm
              onSubmit={handleFormSubmit}
              isLoading={false}
            />
          </>
        )}
      </Card>
    </div>
  );
}
