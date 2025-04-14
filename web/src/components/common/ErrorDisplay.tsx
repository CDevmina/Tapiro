import { Alert } from "flowbite-react";
import React from "react";
import { HiInformationCircle } from "react-icons/hi"; // Example icon

interface ErrorDisplayProps {
  title?: string;
  message?: string;
  error?: Error | unknown; // Accept Error object or other types
  className?: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  title = "An Error Occurred",
  message,
  error,
  className = "container mx-auto px-4 py-12",
}) => {
  let errorMessage = message || "Something went wrong. Please try again later.";

  // Attempt to extract a message from the error object
  if (!message && error instanceof Error) {
    errorMessage = error.message;
  } else if (!message && typeof error === "string") {
    errorMessage = error;
  }

  // Log the full error for debugging (optional)
  if (error) {
    console.error("ErrorDisplay caught:", error);
  }

  return (
    <div className={className}>
      <Alert color="failure" icon={HiInformationCircle}>
        <h3 className="font-medium">{title}</h3>
        <p>{errorMessage}</p>
        {/* Optionally show more details in development */}
        {/* {process.env.NODE_ENV === 'development' && error instanceof Error && (
          <pre className="mt-2 text-xs whitespace-pre-wrap">
            {error.stack}
          </pre>
        )} */}
      </Alert>
    </div>
  );
};

export default ErrorDisplay;
