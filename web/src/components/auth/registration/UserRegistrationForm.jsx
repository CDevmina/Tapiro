import { useState } from "react";
import { useAuthApi } from "../../../api";
import { Button, Checkbox } from "../../common";
import { useAuth } from "../../../hooks/useAuth"; // Import useAuth

export default function UserRegistrationForm({ user, setStep, setError }) {
  const { registerUser } = useAuthApi();
  const { refreshRegistrationStatus } = useAuth(); // Get the refresh function
  const [dataSharingConsent, setDataSharingConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!dataSharingConsent) {
      setError("You must consent to data sharing to complete registration.");
      return;
    }
    setIsSubmitting(true);
    setError(null); // Clear previous errors

    try {
      // Register the user with the API
      await registerUser({
        dataSharingConsent,
      });

      // Refresh the auth context to get the latest registration status
      await refreshRegistrationStatus();

      // Move to completion step (AuthGuard will handle redirect if refresh was successful)
      // We still call setStep to potentially update UI if needed before redirect
      setStep("complete-user");
    } catch (err) {
      console.error("Registration failed:", err);
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "An unknown error occurred.";
      setError(
        `Failed to complete registration: ${errorMsg}. Please try again or contact support.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className="mb-4 text-gray-600">
          Welcome, {user?.name || "User"}! Just one more step to complete your
          registration.
        </p>

        <div className="bg-gray-50 p-4 rounded-md mb-6">
          <h3 className="text-md font-medium mb-2">Account Information</h3>
          <p className="text-sm text-gray-600">Email: {user?.email}</p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-start space-x-3 cursor-pointer">
          <Checkbox
            checked={dataSharingConsent}
            onChange={(e) => setDataSharingConsent(e.target.checked)}
            // Removed required attribute, handling validation in handleSubmit
          />
          <span className="text-sm text-gray-700">
            I consent to sharing my data for personalized recommendations and
            improved services. You can change this setting later. *
          </span>
        </label>
        {!dataSharingConsent &&
          isSubmitting && ( // Show error only if submitted without consent
            <p className="text-red-600 text-sm mt-1">Consent is required.</p>
          )}
      </div>

      <div className="flex justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={() => setStep("type-selection")}
          disabled={isSubmitting}
        >
          Back
        </Button>
        <Button type="submit" variant="primary" isLoading={isSubmitting}>
          Complete Registration
        </Button>
      </div>
    </form>
  );
}
