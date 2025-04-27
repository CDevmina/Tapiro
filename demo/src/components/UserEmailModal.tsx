import React, { useState } from "react";

interface UserEmailModalProps {
  isOpen: boolean;
  onSubmit: (email: string) => void;
}

export function UserEmailModal({ isOpen, onSubmit }: UserEmailModalProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    onSubmit(email);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          Enter Your Email for Personalization
        </h2>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          Provide your email to receive personalized product recommendations
          based on your interactions. This email is used to identify you in the
          Tapiro system.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="emailInput"
              className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
            >
              Email Address
            </label>
            <input
              type="email"
              id="emailInput"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
              placeholder="you@example.com"
              required
            />
            {error && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                {error}
              </p>
            )}
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-700 px-5 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-800 focus:outline-none focus:ring-4 focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
          >
            Continue
          </button>
        </form>
        {/* Optional: Add a 'skip' button if needed */}
        {/* <button
           type="button"
           onClick={() => onSubmit('')} // Pass empty string or handle skip logic
           className="mt-2 w-full text-center text-sm text-gray-500 hover:underline dark:text-gray-400"
         >
           Skip for now
         </button> */}
      </div>
    </div>
  );
}
