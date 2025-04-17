import { useState, useEffect } from "react";
import { Modal, ModalBody, ModalHeader } from "flowbite-react"; // Removed Alert import
import { useRegistrationStatus } from "../../hooks/useRegistrationStatus";
import { RegistrationTypeSelector } from "./RegistrationTypeSelector";
import { UserRegistrationForm } from "./UserRegistrationForm";
import { StoreRegistrationForm } from "./StoreRegistrationForm";
import { RegistrationProgress } from "./RegistrationProgress";
import {
  useRegisterUser,
  useRegisterStore,
} from "../../api/hooks/useAuthHooks";
import { UserCreate, StoreCreate } from "../../api/types/data-contracts";
// Removed HiInformationCircle import if no longer needed elsewhere
// import { HiInformationCircle } from "react-icons/hi";
import ErrorDisplay from "../common/ErrorDisplay"; // Import ErrorDisplay

export function RegistrationCompletionModal() {
  const { shouldShowRegistration, isLoading } = useRegistrationStatus();
  const [step, setStep] = useState(1);
  const [registrationType, setRegistrationType] = useState<
    "user" | "store" | null
  >(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerUserMutation = useRegisterUser();
  const registerStoreMutation = useRegisterStore();

  const totalSteps = 2; // Type selection + form

  useEffect(() => {
    // Only show modal if we're not loading AND registration is needed
    if (!isLoading && shouldShowRegistration) {
      const timer = setTimeout(() => {
        setShowModal(true);
      }, 300);
      return () => clearTimeout(timer);
    } else if (!shouldShowRegistration) {
      // Ensure modal is closed if registration not needed
      setShowModal(false);
    }
  }, [shouldShowRegistration, isLoading]);

  const handleTypeSelected = (type: "user" | "store") => {
    setRegistrationType(type);
    setStep(2);
    setError(null);
  };

  const handleUserSubmit = async (userData: UserCreate) => {
    setError(null);
    try {
      await registerUserMutation.mutateAsync(userData);
    } catch (err) {
      // Catch specific error
      console.error("Failed to complete user registration:", err);
      // Extract message if possible, otherwise use generic message
      const message =
        err instanceof Error
          ? err.message
          : "Failed to complete registration. Please try again.";
      setError(message);
    }
  };

  const handleStoreSubmit = async (storeData: StoreCreate) => {
    setError(null);
    try {
      await registerStoreMutation.mutateAsync(storeData);
    } catch (err) {
      // Catch specific error
      console.error("Failed to complete store registration:", err);
      // Extract message if possible, otherwise use generic message
      const message =
        err instanceof Error
          ? err.message
          : "Failed to complete registration. Please try again.";
      setError(message);
    }
  };

  const handleBack = () => {
    setStep(1);
    setRegistrationType(null);
    setError(null);
  };

  return (
    // Flowbite Modal handles dark mode
    <Modal show={showModal} size="md" popup dismissible={false}>
      <ModalHeader /> {/* Optional: Add title here if needed */}
      <ModalBody>
        <RegistrationProgress step={step} totalSteps={totalSteps} />

        {error && (
          <ErrorDisplay
            title="Registration Failed"
            message={error}
            className="mb-4"
          />
        )}

        {step === 1 && (
          <RegistrationTypeSelector onTypeSelected={handleTypeSelected} />
        )}

        {step === 2 && registrationType === "user" && (
          <>
            <button
              onClick={handleBack}
              // Add dark mode text color and hover
              className="mb-4 text-sm text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
            >
              &larr; Back to type selection
            </button>
            <UserRegistrationForm
              onSubmit={handleUserSubmit}
              isLoading={registerUserMutation.isPending}
            />
          </>
        )}

        {step === 2 && registrationType === "store" && (
          <>
            <button
              onClick={handleBack}
              // Add dark mode text color and hover
              className="mb-4 text-sm text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
            >
              &larr; Back to type selection
            </button>
            <StoreRegistrationForm
              onSubmit={handleStoreSubmit}
              isLoading={registerStoreMutation.isPending}
            />
          </>
        )}
      </ModalBody>
    </Modal>
  );
}
