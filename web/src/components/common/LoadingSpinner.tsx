import React from "react";

interface LoadingSpinnerProps {
  size?: "small" | "medium" | "large";
  fullHeight?: boolean;
  message?: string;
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = "medium",
  fullHeight = false,
  message,
  className = "",
}) => {
  // Determine size classes
  const sizeClasses = {
    small: "h-6 w-6 border-2",
    medium: "h-12 w-12 border-t-2 border-b-2",
    large: "h-16 w-16 border-4",
  };

  // Container classes
  const containerClasses = fullHeight
    ? "flex flex-col justify-center items-center h-full min-h-64"
    : "flex flex-col justify-center items-center py-8";

  return (
    <div className={`${containerClasses} ${className}`}>
      <div
        className={`animate-spin rounded-full ${sizeClasses[size]} border-primary-500`}
        role="status"
        aria-label="Loading"
      />
      {message && (
        <p className="mt-4 text-gray-600 dark:text-gray-400">{message}</p>
      )}
    </div>
  );
};
