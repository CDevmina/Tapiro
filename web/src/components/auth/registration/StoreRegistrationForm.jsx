import { useState } from "react";
import { useAuthApi } from "../../../api";
import { Button, Input } from "../../common";
import { useAuth } from "../../../hooks/useAuth"; // Import useAuth

export default function StoreRegistrationForm({ user, setError }) {
  const { registerStore } = useAuthApi();
  const { refreshRegistrationStatus } = useAuth(); // Get the refresh function
  const [formData, setFormData] = useState({
    name: "",
    address: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null); // Clear previous errors

    try {
      // Register the store with the API
      await registerStore({
        name: formData.name,
        address: formData.address,
      });

      // Refresh the auth context to get the latest registration status
      await refreshRegistrationStatus();
    } catch (err) {
      console.error("Store registration failed:", err);
      const errorMsg =
        err.response?.data?.message ||
        err.message ||
        "An unknown error occurred.";
      setError(
        `Failed to complete store registration: ${errorMsg}. Please try again or contact support.`
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <p className="mb-4 text-gray-600">
          Welcome, {user?.name || "Store Owner"}! Please provide your store
          details.
        </p>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Store Name *
          </label>
          <Input
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label
            htmlFor="address"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Store Address *
          </label>
          <Input
            id="address"
            name="address"
            value={formData.address}
            onChange={handleChange}
            required
          />
        </div>
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
