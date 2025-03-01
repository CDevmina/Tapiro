import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { BackButton } from "@/components/common/BackButton";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

const RegisterStore = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  // Form fields based on OpenAPI schema
  const [name, setName] = useState("");
  const [bussinessType, setBussinessType] = useState("");
  const [address, setAddress] = useState("");
  const [dataSharingConsent, setDataSharingConsent] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<
    Array<"purchase" | "opt-out">
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const businessTypes = [
    "Retail",
    "Restaurant",
    "Technology",
    "Fashion",
    "Entertainment",
    "Healthcare",
    "Finance",
    "Education",
    "Other",
  ];

  const handleEventChange = (event: "purchase" | "opt-out") => {
    if (webhookEvents.includes(event)) {
      setWebhookEvents(webhookEvents.filter((e) => e !== event));
    } else {
      setWebhookEvents([...webhookEvents, event]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!name || !bussinessType || !address) {
      setError("Name, business type, and address are required fields");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Store registration data in sessionStorage
      sessionStorage.setItem(
        "registration_data",
        JSON.stringify({
          name,
          bussinessType,
          address,
          dataSharingConsent,
          webhooks: webhookUrl
            ? [
                {
                  url: webhookUrl,
                  events: webhookEvents,
                },
              ]
            : undefined,
        })
      );

      // Redirect to Auth0 for authentication
      await login();
    } catch (err) {
      console.error("Store registration failed:", err);
      setError("Registration process failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <BackButton to="/register" />
      <h1 className="text-3xl font-bold mb-8">Create Store Account</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Store Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="form-input"
            required
          />
        </div>

        <div>
          <label
            htmlFor="bussinessType"
            className="block text-sm font-medium mb-1"
          >
            Business Type <span className="text-red-500">*</span>
          </label>
          <select
            id="bussinessType"
            value={bussinessType}
            onChange={(e) => setBussinessType(e.target.value)}
            className="form-input"
            required
          >
            <option value="">Select a business type</option>
            {businessTypes.map((type) => (
              <option key={type} value={type.toLowerCase()}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="address" className="block text-sm font-medium mb-1">
            Store Address <span className="text-red-500">*</span>
          </label>
          <textarea
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="form-input"
            rows={3}
            required
          />
        </div>

        <div>
          <label
            htmlFor="webhookUrl"
            className="block text-sm font-medium mb-1"
          >
            Webhook URL (Optional)
          </label>
          <input
            id="webhookUrl"
            type="url"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            className="form-input"
            placeholder="https://example.com/webhook"
          />
        </div>

        {webhookUrl && (
          <div>
            <label className="block text-sm font-medium mb-2">
              Webhook Events
            </label>
            <div className="space-y-2">
              <div className="flex items-center">
                <input
                  id="event-purchase"
                  type="checkbox"
                  checked={webhookEvents.includes("purchase")}
                  onChange={() => handleEventChange("purchase")}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="event-purchase" className="ml-2">
                  Purchase Events
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="event-opt-out"
                  type="checkbox"
                  checked={webhookEvents.includes("opt-out")}
                  onChange={() => handleEventChange("opt-out")}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor="event-opt-out" className="ml-2">
                  Opt-out Events
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center">
          <input
            id="dataSharingConsent"
            type="checkbox"
            checked={dataSharingConsent}
            onChange={(e) => setDataSharingConsent(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <label htmlFor="dataSharingConsent" className="ml-2 block text-sm">
            I consent to share store data for marketing purposes
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary w-full"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <LoadingSpinner size="small" className="mr-2" /> Signing Up...
            </span>
          ) : (
            "Continue to Sign Up"
          )}
        </button>
      </form>
    </div>
  );
};

export default RegisterStore;
