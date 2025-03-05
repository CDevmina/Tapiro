const Card = ({
  children,
  className = "",
  variant = "default",
  as = "div",
  hover = false,
  ...rest
}) => {
  const variants = {
    default: "bg-white border border-gray-200 shadow-soft",
    flat: "bg-white border border-gray-200",
    elevated: "bg-white border border-gray-200 shadow-md",
    transparent: "bg-transparent",
  };

  const hoverClass = hover
    ? "transform transition-transform duration-300 hover:-translate-y-1 hover:shadow-hover"
    : "";
  const Component = as;

  return (
    <Component
      className={`${variants[variant]} ${hoverClass} ${className} rounded-xl overflow-hidden`}
      {...rest}
    >
      {children}
    </Component>
  );
};

export default Card;
