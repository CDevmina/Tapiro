import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserService } from "@/services/userService";
import { BackButton } from "@/components/common/BackButton";

const RegisterUser = () => {
  const { isAuthenticated, user, login } = useAuth();
  const { registerUser } = useUserService();
  const navigate = useNavigate();

  const [phone, setPhone] = useState("");
  const [preferences, setPreferences] = useState<string[]>([]);
  const [dataSharingConsent, setDataSharingConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Common preference categories
  const preferenceOptions = [
    "Electronics",
    "Fashion",
    "Home",
    "Beauty",
    "Sports",
    "Books",
  ];

  const handlePreferenceChange = (preference: string) => {
    if (preferences.includes(preference)) {
      setPreferences(preferences.filter((p) => p !== preference));
    } else {
      setPreferences([...preferences, preference]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // If not authenticated yet, redirect to Auth0 login/signup
      if (!isAuthenticated) {
        localStorage.setItem("registration_type", "user");
        localStorage.setItem(
          "registration_data",
          JSON.stringify({
            phone,
            preferences,
            dataSharingConsent,
          })
        );
        await login();
        return;
      }

      // If already authenticated, complete registration
      await registerUser({
        phone,
        preferences,
        dataSharingConsent,
      });

      navigate("/");
    } catch (err) {
      console.error("Registration failed:", err);
      setError("Registration failed. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <BackButton to="/register" />
      <h1 className="text-3xl font-bold mb-8">Create User Account</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1">
            Phone Number (optional)
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="form-input"
            placeholder="+1 (123) 456-7890"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">
            Preferences (Select all that apply)
          </label>
          <div className="space-y-2">
            {preferenceOptions.map((preference) => (
              <div key={preference} className="flex items-center">
                <input
                  id={`preference-${preference}`}
                  type="checkbox"
                  checked={preferences.includes(preference)}
                  onChange={() => handlePreferenceChange(preference)}
                  className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <label htmlFor={`preference-${preference}`} className="ml-2">
                  {preference}
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center">
          <input
            id="dataSharingConsent"
            type="checkbox"
            checked={dataSharingConsent}
            onChange={(e) => setDataSharingConsent(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
            required
          />
          <label htmlFor="dataSharingConsent" className="ml-2 block text-sm">
            I consent to share my data for personalized advertising
          </label>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary w-full"
        >
          {isSubmitting ? "Creating account..." : "Create Account"}
        </button>
      </form>
    </div>
  );
};

export default RegisterUser;
