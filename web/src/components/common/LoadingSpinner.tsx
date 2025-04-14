import { Spinner } from "flowbite-react";
import React from "react";

interface LoadingSpinnerProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  message?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "xl", // Default to a larger size for page loads
  message = "Loading...",
  className = "flex justify-center items-center min-h-screen", // Center on screen by default
}) => {
  return (
    <div className={className} role="status" aria-live="polite">
      <Spinner aria-label={message} size={size} />
      <span className="sr-only">{message}</span> {/* For screen readers */}
      {/* Optional: Display message visually */}
      {/* <span className="ml-2 text-gray-500 dark:text-gray-400">{message}</span> */}
    </div>
  );
};

export default LoadingSpinner;
