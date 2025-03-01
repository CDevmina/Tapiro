import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserService } from "@/services/userService";

const RegisterStore = () => {
  const { isAuthenticated, user, login } = useAuth();
  const { registerStore } = useUserService();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<
    Array<"purchase" | "opt-out">
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleEventChange = (event: "purchase" | "opt-out") => {
    if (webhookEvents.includes(event)) {
      setWebhookEvents(webhookEvents.filter((e) => e !== event));
    } else {
      setWebhookEvents([...webhookEvents, event]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // If not authenticated yet, redirect to Auth0 login/signup
      if (!isAuthenticated) {
        localStorage.setItem("registration_type", "store");
        localStorage.setItem(
          "registration_data",
          JSON.stringify({
            name,
            address,
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
        await login();
        return;
      }

      // If already authenticated, complete registration
      await registerStore({
        name,
        address,
        webhooks: webhookUrl
          ? [
              {
                url: webhookUrl,
                events: webhookEvents,
              },
            ]
          : undefined,
      });

      navigate("/");
    } catch (err) {
      console.error("Store registration failed:", err);
      setError("Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <h1 className="text-3xl font-bold mb-8">Create Store Account</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Store Name
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
          <label htmlFor="address" className="block text-sm font-medium mb-1">
            Store Address
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

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary w-full"
        >
          {isSubmitting ? "Creating store..." : "Create Store Account"}
        </button>
      </form>
    </div>
  );
};

export default RegisterStore;
