import { useState } from "react";
import { Modal, ModalBody, ModalHeader } from "flowbite-react";
import { RegistrationTypeSelector } from "./RegistrationTypeSelector";
import { UserRegistrationForm } from "./UserRegistrationForm";
import { StoreRegistrationForm } from "./StoreRegistrationForm";
import { RegistrationProgress } from "./RegistrationProgress";
import {
  useRegisterUser,
  useRegisterStore,
} from "../../api/hooks/useAuthHooks";
import { UserCreate, StoreCreate } from "../../api/types/data-contracts";
import ErrorDisplay from "../common/ErrorDisplay";

export function RegistrationCompletionModal() {
  const [step, setStep] = useState(1);
  const [registrationType, setRegistrationType] = useState<
    "user" | "store" | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const registerUserMutation = useRegisterUser();
  const registerStoreMutation = useRegisterStore();

  const totalSteps = 2; // Type selection + form

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
      console.error("Failed to complete user registration:", err);
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
      console.error("Failed to complete store registration:", err);
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
    <Modal show={true} size="md" popup dismissible={false}>
      <ModalHeader />
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
