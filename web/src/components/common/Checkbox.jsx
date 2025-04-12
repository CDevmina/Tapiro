import { forwardRef } from "react";

const Checkbox = forwardRef(
  (
    {
      id,
      name,
      checked,
      onChange,
      disabled = false,
      required = false,
      className = "",
      ...rest
    },
    ref
  ) => {
    return (
      <input
        ref={ref}
        type="checkbox"
        id={id}
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        required={required}
        className={`h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500 ${className}`}
        {...rest}
      />
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
