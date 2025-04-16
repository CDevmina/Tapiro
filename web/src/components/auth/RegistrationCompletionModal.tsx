import { useState, useEffect } from "react";
import { Modal, ModalBody, ModalHeader, Alert } from "flowbite-react";
import { useRegistrationStatus } from "../../hooks/useRegistrationStatus";
import { RegistrationTypeSelector } from "./RegistrationTypeSelector";
import { UserRegistrationForm } from "./UserRegistrationForm";
import { StoreRegistrationForm } from "./StoreRegistrationForm";
import { RegistrationProgress } from "./RegistrationProgress";
import {
  useRegisterUser,
  useRegisterStore,
  useUpdateUserMetadata,
} from "../../api/hooks/useAuthHooks";
import { UserCreate, StoreCreate } from "../../api/types/data-contracts";
import { HiInformationCircle } from "react-icons/hi";

export function RegistrationCompletionModal() {
  const { shouldShowRegistration } = useRegistrationStatus();
  const [step, setStep] = useState(1);
  const [registrationType, setRegistrationType] = useState<
    "user" | "store" | null
  >(null);
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const registerUserMutation = useRegisterUser();
  const registerStoreMutation = useRegisterStore();
  const updateMetadataMutation = useUpdateUserMetadata();

  const totalSteps = 2; // Type selection + form

  useEffect(() => {
    // Small delay to prevent modal from showing immediately during navigation
    const timer = setTimeout(() => {
      setShowModal(shouldShowRegistration);
    }, 300);

    return () => clearTimeout(timer);
  }, [shouldShowRegistration]);

  const handleTypeSelected = (type: "user" | "store") => {
    setRegistrationType(type);
    setStep(2);
    setError(null);
  };

  const handleUserSubmit = async (userData: UserCreate) => {
    setError(null);
    try {
      // Register the user
      await registerUserMutation.mutateAsync(userData);

      // Update metadata to mark registration as complete
      await updateMetadataMutation.mutateAsync({
        registrationType: "user",
        registrationComplete: true,
      });
    } catch (error) {
      console.error("Failed to complete user registration:", error);
      setError("Failed to complete registration. Please try again.");
    }
  };

  const handleStoreSubmit = async (storeData: StoreCreate) => {
    setError(null);
    try {
      // Register the store
      await registerStoreMutation.mutateAsync(storeData);

      // Update metadata to mark registration as complete
      await updateMetadataMutation.mutateAsync({
        registrationType: "store",
        registrationComplete: true,
      });
    } catch (error) {
      console.error("Failed to complete store registration:", error);
      setError("Failed to complete registration. Please try again.");
    }
  };

  const handleBack = () => {
    setStep(1);
    setRegistrationType(null);
    setError(null);
  };

  return (
    <Modal show={showModal} size="md" popup dismissible={false}>
      <ModalHeader />
      <ModalBody>
        <RegistrationProgress step={step} totalSteps={totalSteps} />

        {error && (
          <Alert color="failure" icon={HiInformationCircle} className="mb-4">
            {error}
          </Alert>
        )}

        {step === 1 && (
          <RegistrationTypeSelector onTypeSelected={handleTypeSelected} />
        )}

        {step === 2 && registrationType === "user" && (
          <>
            <button
              onClick={handleBack}
              className="mb-4 text-blue-600 hover:underline"
            >
              &larr; Back
            </button>
            <UserRegistrationForm
              onSubmit={handleUserSubmit}
              isLoading={
                registerUserMutation.isPending ||
                updateMetadataMutation.isPending
              }
            />
          </>
        )}

        {step === 2 && registrationType === "store" && (
          <>
            <button
              onClick={handleBack}
              className="mb-4 text-blue-600 hover:underline"
            >
              &larr; Back
            </button>
            <StoreRegistrationForm
              onSubmit={handleStoreSubmit}
              isLoading={
                registerStoreMutation.isPending ||
                updateMetadataMutation.isPending
              }
            />
          </>
        )}
      </ModalBody>
    </Modal>
  );
}
