const Avatar = ({
  src = "",
  alt = "",
  size = "md",
  variant = "circle",
  name = "",
  className = "",
  ...rest
}) => {
  // Size variants
  const sizes = {
    xs: "h-6 w-6 text-xs",
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-12 w-12 text-lg",
    xl: "h-14 w-14 text-xl",
    "2xl": "h-16 w-16 text-2xl",
  };

  // Shape variants
  const variants = {
    circle: "rounded-full",
    square: "rounded-md",
  };

  // Generate initials from name
  const getInitials = (fullName) => {
    if (!fullName) return "";
    return fullName
      .split(" ")
      .map((name) => name[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  // Get background color based on name string
  const getColorFromName = (name) => {
    if (!name) return "bg-primary-500";

    const colors = [
      "bg-red-500",
      "bg-orange-500",
      "bg-amber-500",
      "bg-yellow-500",
      "bg-lime-500",
      "bg-green-500",
      "bg-emerald-500",
      "bg-teal-500",
      "bg-cyan-500",
      "bg-sky-500",
      "bg-blue-500",
      "bg-indigo-500",
      "bg-violet-500",
      "bg-purple-500",
      "bg-fuchsia-500",
      "bg-pink-500",
      "bg-rose-500",
    ];

    const charCodeSum = name
      .split("")
      .reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return colors[charCodeSum % colors.length];
  };

  // If there's an image source, render the image
  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={`${sizes[size]} ${variants[variant]} ${className} object-cover`}
        {...rest}
      />
    );
  }

  // Otherwise render initials
  const initials = getInitials(name);
  const bgColor = getColorFromName(name);

  return (
    <div
      className={`
        ${sizes[size]}
        ${variants[variant]}
        ${bgColor}
        ${className}
        flex items-center justify-center text-white font-medium
      `}
      {...rest}
    >
      {initials}
    </div>
  );
};

export default Avatar;
