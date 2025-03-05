import { useState, useEffect, useCallback } from "react";

const Alert = ({
  title,
  children,
  variant = "info",
  dismissible = false,
  className = "",
  icon = null,
  onClose,
  autoClose = false,
  autoCloseTime = 5000,
  ...rest
}) => {
  const [isVisible, setIsVisible] = useState(true);

  const variants = {
    info: "bg-blue-50 border-blue-200 text-blue-800",
    success: "bg-green-50 border-green-200 text-green-800",
    warning: "bg-yellow-50 border-yellow-200 text-yellow-800",
    error: "bg-red-50 border-red-200 text-red-800",
    primary: "bg-primary-50 border-primary-200 text-primary-800",
  };

  // Memoize the handleClose function with useCallback
  const handleClose = useCallback(() => {
    setIsVisible(false);
    if (onClose) {
      setTimeout(() => {
        onClose();
      }, 300);
    }
  }, [onClose]);

  useEffect(() => {
    let timer;
    if (autoClose) {
      timer = setTimeout(() => {
        handleClose();
      }, autoCloseTime);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [autoClose, autoCloseTime, handleClose]); // Added handleClose to dependencies

  if (!isVisible) return null;

  return (
    <div
      className={`
        ${variants[variant]}
        ${className}
        border-l-4 p-4 rounded-r-md
        transition-all duration-300
        animate-fade-in
      `}
      role="alert"
      {...rest}
    >
      {/* Rest of component remains unchanged */}
      <div className="flex items-start">
        {icon && <div className="flex-shrink-0 mr-3">{icon}</div>}

        <div className="flex-1">
          {title && <h3 className="font-medium">{title}</h3>}

          {children && <div className="text-sm mt-1">{children}</div>}
        </div>

        {dismissible && (
          <button
            type="button"
            className="ml-4 -mt-1 -mr-2 p-1.5 rounded-md text-gray-500 hover:bg-opacity-10 hover:bg-gray-600"
            onClick={handleClose}
            aria-label="Close alert"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
};

export default Alert;
