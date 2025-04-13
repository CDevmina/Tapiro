import { useState } from "react";
import { useAuthApi } from "../../../api";
import { Button, Checkbox } from "../../common";

export default function UserRegistrationForm({ user, setStep, setError }) {
  const { registerUser } = useAuthApi();
  const [dataSharingConsent, setDataSharingConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Register the user with the API
      await registerUser({
        dataSharingConsent,
      });

      // Move to completion step
      setStep("complete-user");
    } catch (err) {
      console.error("Registration failed:", err);
      setError(
        "Failed to complete registration. Please try again or contact support."
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
        <label className="flex items-start space-x-3">
          <Checkbox
            checked={dataSharingConsent}
            onChange={(e) => setDataSharingConsent(e.target.checked)}
            required
          />
          <span className="text-sm text-gray-700">
            I consent to sharing my data for personalized recommendations and
            improved services. You can change this setting later.
          </span>
        </label>
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
