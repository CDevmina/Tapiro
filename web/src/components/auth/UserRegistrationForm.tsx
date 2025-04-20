import { useState } from "react";
import {
  Button,
  Checkbox,
  Label,
  Modal, // Import Modal components
  ModalHeader,
  ModalBody,
  ModalFooter,
  Popover, // <-- Import Popover
} from "flowbite-react";
import { UserCreate } from "../../api/types/data-contracts";
import LoadingSpinner from "../common/LoadingSpinner";
import { HiCheckCircle, HiInformationCircle } from "react-icons/hi"; // Import icons

interface UserRegistrationFormProps {
  onSubmit: (userData: UserCreate) => void;
  isLoading: boolean;
}

export function UserRegistrationForm({
  onSubmit,
  isLoading,
}: UserRegistrationFormProps) {
  // State for the main consent checkbox
  const [dataSharingConsent, setDataSharingConsent] = useState(false);
  // State for the GDPR consent modal
  const [showConsentModal, setShowConsentModal] = useState(false);
  // State to track if consent has been explicitly accepted via the modal
  const [consentAccepted, setConsentAccepted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Ensure consent was actually accepted via the modal flow if required
    if (!consentAccepted) {
      // Optionally show an error or prompt to review consent
      console.warn("Consent not explicitly accepted via modal.");
      // Depending on strictness, you might prevent submission:
      // return;
    }

    const userData: UserCreate = {
      // Use the state variable linked to the checkbox
      dataSharingConsent: dataSharingConsent,
      preferences: [], // We can leave this empty for now
    };

    onSubmit(userData);
  };

  const handleAcceptConsent = () => {
    setDataSharingConsent(true);
    setConsentAccepted(true); // Mark as accepted
    setShowConsentModal(false);
  };

  const handleDeclineConsent = () => {
    setDataSharingConsent(false);
    setConsentAccepted(false); // Mark as not accepted (or reset)
    setShowConsentModal(false);
  };

  // Content for the popover
  const popoverContent = (
    <div className="w-64 p-3 text-sm text-gray-500 dark:text-gray-400">
      <p>
        Please click 'Review Data Sharing Consent Details' first to read and
        accept the terms.
      </p>
    </div>
  );

  return (
    <>
      <form className="space-y-6" onSubmit={handleSubmit}>
        <h3 className="text-center text-xl font-medium text-gray-900 dark:text-white">
          Complete User Registration
        </h3>

        {/* Consent Section */}
        <div className="flex flex-col space-y-2 rounded border border-gray-200 p-4 dark:border-gray-600">
          {/* Conditionally wrap Checkbox/Label in Popover */}
          {!consentAccepted ? (
            <Popover content={popoverContent} trigger="hover">
              {/* This div is the target for the popover when checkbox is disabled */}
              <div className="flex cursor-not-allowed items-center gap-2 opacity-50">
                {" "}
                {/* Add styling for disabled look */}
                <Checkbox
                  id="data-sharing-disabled" // Use different ID when disabled to avoid label conflict
                  checked={false} // Always false when disabled
                  disabled={true}
                  readOnly // Prevent interaction
                />
                <Label
                  htmlFor="data-sharing-disabled"
                  className="flex text-gray-700 dark:text-gray-300"
                >
                  I agree to the data sharing terms
                </Label>
              </div>
            </Popover>
          ) : (
            // Render the interactive Checkbox/Label when consent is accepted
            <div className="flex items-center gap-2">
              <Checkbox
                id="data-sharing"
                checked={dataSharingConsent}
                disabled={false} // Enable it
                onChange={(e) => setDataSharingConsent(e.target.checked)}
                required
              />
              <Label
                htmlFor="data-sharing"
                className="flex text-gray-700 dark:text-gray-300"
              >
                I agree to the data sharing terms
              </Label>
            </div>
          )}

          {/* Button to open the modal remains the same */}
          <button
            type="button"
            onClick={() => setShowConsentModal(true)}
            className="inline-flex items-center text-sm text-blue-600 hover:underline dark:text-blue-500"
          >
            <HiInformationCircle className="mr-1 h-4 w-4" />
            Review Data Sharing Consent Details
          </button>
          {/* Confirmation message remains the same */}
          {consentAccepted && (
            <p className="mt-1 flex items-center text-sm text-green-600 dark:text-green-400">
              <HiCheckCircle className="mr-1 h-4 w-4" /> Consent Accepted
            </p>
          )}
        </div>

        {/* Submit button logic remains the same */}
        <div className="flex justify-center pt-2">
          {isLoading ? (
            <LoadingSpinner size="md" className="py-2" />
          ) : (
            <Button
              type="submit"
              disabled={isLoading || !consentAccepted} // Disable if loading OR consent not accepted
              size="lg"
              title={
                !consentAccepted
                  ? "Please review and accept the data sharing consent first"
                  : ""
              }
            >
              Complete Registration
            </Button>
          )}
        </div>
      </form>

      {/* GDPR Consent Modal */}
      <Modal
        show={showConsentModal}
        size="xl" // Adjust size as needed
        onClose={handleDeclineConsent} // Declining if closed without explicit accept
        popup
      >
        <div className="relative flex flex-col gap-4 p-4">
          <ModalHeader>Data Sharing Consent</ModalHeader>
        </div>
        <ModalBody>
          <div className="space-y-4 p-4 text-base leading-relaxed text-gray-700 dark:text-gray-300">
            <p>
              To provide personalized recommendations and enhance your
              experience, we need your consent to share certain data with the
              stores you interact with through Tapiro.
            </p>
            <p>
              <span className="font-semibold">What data is shared?</span>
              <br />
              We may share anonymized or pseudonymized identifiers, your stated
              preferences (if any), and interaction data related to product
              views or interests within the Tapiro platform. We will{" "}
              <span className="font-semibold">never</span> share your direct
              email address or phone number unless you explicitly provide it to
              a store.
            </p>
            <p>
              <span className="font-semibold">How is it used?</span>
              <br />
              Stores use this data solely to tailor product recommendations and
              offers presented to you through the Tapiro service.
            </p>
            <p>
              <span className="font-semibold">Your Control:</span>
              <br />
              You can withdraw this consent or manage your data sharing
              preferences at any time in your user profile settings. Please
              review our full Privacy Policy for more details.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              By clicking "Accept", you agree to these terms.
            </p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button onClick={handleAcceptConsent}>Accept</Button>
          <Button color="alternative" onClick={handleDeclineConsent}>
            Decline
          </Button>
        </ModalFooter>
      </Modal>
    </>
  );
}
