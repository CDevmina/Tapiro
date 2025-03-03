import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { BackButton } from "@/components/common/BackButton";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";

const RegisterUser = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Form fields - basic information
  const [username, setUsername] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check for error passed from redirect
  useEffect(() => {
    if (location.state?.error) {
      setError(location.state.error);
      navigate(location.pathname, { replace: true, state: {} });
    }

    // Load saved data if any
    const registrationDataStr = sessionStorage.getItem("registration_data");
    if (registrationDataStr) {
      try {
        const savedData = JSON.parse(registrationDataStr);
        setUsername(savedData.username || "");

        // Handle name split for existing data
        if (savedData.name) {
          const nameParts = savedData.name.split(" ");
          setFirstName(nameParts[0] || "");
          setLastName(nameParts.slice(1).join(" ") || "");
        }
      } catch (e) {
        console.error("Error parsing saved registration data:", e);
      }
    }
  }, [location, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!username) {
      setError("Username is required");
      return;
    }

    if (username.length < 3 || username.length > 15) {
      setError("Username must be between 3 and 15 characters");
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
      setError(
        "Username can only contain letters, numbers, underscores, and hyphens"
      );
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      // Join first and last name
      const name = [firstName, lastName].filter(Boolean).join(" ");

      // Store basic registration data in sessionStorage
      const currentData = sessionStorage.getItem("registration_data")
        ? JSON.parse(sessionStorage.getItem("registration_data")!)
        : {};

      const updatedData = {
        ...currentData,
        username,
        name,
        registrationAttempts: 0,
      };

      sessionStorage.setItem("registration_data", JSON.stringify(updatedData));
      sessionStorage.setItem("registration_type", "user");

      // Navigate to preferences page
      navigate("/register/user/preferences");
    } catch (err) {
      console.error("Form submission failed:", err);
      setError("Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto py-12">
      <BackButton to="/register" />
      <h1 className="text-3xl font-bold mb-8">Create User Account</h1>

      <div className="flex mb-6">
        <div className="flex-1">
          <div className="bg-blue-500 text-white text-center py-2 px-4 rounded-l">
            1. Basic Info
          </div>
        </div>
        <div className="flex-1">
          <div className="bg-gray-200 text-gray-500 text-center py-2 px-4 rounded-r">
            2. Preferences
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="username" className="block text-sm font-medium mb-1">
            Username <span className="text-red-500">*</span>
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="form-input"
            required
            placeholder="Choose a unique username"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="firstName"
              className="block text-sm font-medium mb-1"
            >
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="form-input"
              placeholder="First name"
            />
          </div>

          <div>
            <label
              htmlFor="lastName"
              className="block text-sm font-medium mb-1"
            >
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="form-input"
              placeholder="Last name"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary w-full"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center">
              <LoadingSpinner size="small" className="mr-2" /> Continuing...
            </span>
          ) : (
            "Continue to Sign Up"
          )}
        </button>
      </form>
    </div>
  );
};

export default RegisterUser;
