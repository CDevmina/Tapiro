const Badge = ({
  children,
  variant = "primary",
  size = "md",
  rounded = false,
  className = "",
  ...rest
}) => {
  // Variants
  const variants = {
    primary: "bg-primary-100 text-primary-800",
    secondary: "bg-secondary-100 text-secondary-800",
    success: "bg-green-100 text-green-800",
    danger: "bg-red-100 text-red-800",
    warning: "bg-yellow-100 text-yellow-800",
    info: "bg-blue-100 text-blue-800",
    light: "bg-gray-100 text-gray-800",
    dark: "bg-gray-700 text-white",
  };

  // Sizes
  const sizes = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-0.5",
    lg: "text-base px-3 py-1",
  };

  const roundedClass = rounded ? "rounded-full" : "rounded";

  return (
    <span
      className={`${variants[variant]} ${sizes[size]} ${roundedClass} ${className} inline-block font-medium`}
      {...rest}
    >
      {children}
    </span>
  );
};

export default Badge;
