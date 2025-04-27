import React, { useState } from "react";

interface ApiKeyModalProps {
  isOpen: boolean;
  onSubmit: (apiKey: string) => void;
  currentApiKey?: string | null; // Optional: To prefill or show current key
}

export function ApiKeyModal({
  isOpen,
  onSubmit,
  currentApiKey,
}: ApiKeyModalProps) {
  const [apiKey, setApiKey] = useState(currentApiKey || "");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError("Please enter a valid API Key.");
      return;
    }
    setError("");
    onSubmit(apiKey.trim());
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800">
        <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          Enter Your Store API Key
        </h2>
        <p className="mb-6 text-sm text-gray-600 dark:text-gray-400">
          Provide the API key generated from your Tapiro Store Dashboard to
          interact with the API.
        </p>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label
              htmlFor="apiKeyInput"
              className="mb-2 block text-sm font-medium text-gray-900 dark:text-white"
            >
              API Key
            </label>
            <input
              type="text" // Changed from password for visibility as requested
              id="apiKeyInput"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="block w-full rounded-lg border border-gray-300 bg-gray-50 p-2.5 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-500 dark:focus:ring-blue-500"
              placeholder="Enter your API key"
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
            Set API Key
          </button>
        </form>
      </div>
    </div>
  );
}
