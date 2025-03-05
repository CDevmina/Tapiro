import { forwardRef } from "react";

const Input = forwardRef(
  (
    {
      id,
      name,
      label,
      type = "text",
      placeholder = "",
      value,
      onChange,
      onBlur,
      error,
      helperText,
      className = "",
      size = "md",
      disabled = false,
      required = false,
      leadingIcon = null,
      trailingIcon = null,
      fullWidth = false,
      ...rest
    },
    ref
  ) => {
    // Size variants
    const sizes = {
      sm: "py-1.5 px-3 text-sm",
      md: "py-2 px-4 text-base",
      lg: "py-2.5 px-5 text-lg",
    };

    const inputSize = sizes[size];
    const widthClass = fullWidth ? "w-full" : "";
    const errorClass = error
      ? "border-red-500 focus:border-red-500 focus:ring-red-500"
      : "";
    const disabledClass = disabled
      ? "bg-gray-100 text-gray-500 cursor-not-allowed"
      : "";
    const leadingIconClass = leadingIcon ? "pl-10" : "";
    const trailingIconClass = trailingIcon ? "pr-10" : "";

    return (
      <div className={`${widthClass} ${className}`}>
        {label && (
          <label
            htmlFor={id}
            className="block text-sm font-medium text-secondary-900 mb-1.5"
          >
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          {leadingIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leadingIcon}
            </div>
          )}

          <input
            ref={ref}
            id={id}
            name={name}
            type={type}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            disabled={disabled}
            placeholder={placeholder}
            required={required}
            className={`
            ${inputSize}
            ${widthClass}
            ${errorClass}
            ${disabledClass}
            ${leadingIconClass}
            ${trailingIconClass}
            border border-gray-300 rounded-lg shadow-sm
            focus:ring-2 focus:ring-primary-500 focus:border-primary-500
            transition-colors duration-200
            placeholder:text-gray-400
            outline-none
          `}
            {...rest}
          />

          {trailingIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {trailingIcon}
            </div>
          )}
        </div>

        {(error || helperText) && (
          <p
            className={`mt-1.5 text-sm ${
              error ? "text-red-500" : "text-gray-500"
            }`}
          >
            {error || helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
