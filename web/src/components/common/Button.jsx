import { forwardRef } from "react";

const Button = forwardRef(
  (
    {
      children,
      variant = "primary",
      size = "md",
      className = "",
      disabled = false,
      isLoading = false,
      leftIcon = null,
      rightIcon = null,
      fullWidth = false,
      type = "button",
      onClick,
      ...rest
    },
    ref
  ) => {
    // Style variants
    const variants = {
      primary: "bg-primary-500 hover:bg-primary-600 text-white shadow-sm",
      secondary:
        "bg-white border border-gray-300 text-secondary-900 hover:bg-gray-50 shadow-sm",
      outline:
        "bg-transparent border border-primary-500 text-primary-500 hover:bg-primary-50",
      ghost: "bg-transparent text-primary-500 hover:bg-primary-50",
      link: "bg-transparent text-primary-500 hover:underline px-0",
    };

    // Size variants
    const sizes = {
      xs: "text-xs px-2 py-1 rounded",
      sm: "text-sm px-3 py-1.5 rounded",
      md: "text-sm px-4 py-2 rounded-md",
      lg: "text-base px-5 py-2.5 rounded-md",
      xl: "text-lg px-6 py-3 rounded-md",
    };

    const loadingClass = isLoading ? "opacity-80 cursor-not-allowed" : "";
    const disabledClass = disabled
      ? "opacity-60 cursor-not-allowed pointer-events-none"
      : "";
    const widthClass = fullWidth ? "w-full" : "";

    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        className={`
        ${variants[variant]}
        ${sizes[size]}
        ${widthClass}
        ${loadingClass}
        ${disabledClass}
        ${className}
        transition-all duration-200 ease-in-out
        font-medium focus:ring-2 focus:ring-offset-2 focus:ring-primary-400
        flex items-center justify-center
      `}
        onClick={onClick}
        {...rest}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
        )}

        {leftIcon && !isLoading && <span className="mr-2">{leftIcon}</span>}

        {children}

        {rightIcon && <span className="ml-2">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = "Button";

export default Button;
