import { Breadcrumb, BreadcrumbItem } from "flowbite-react";
import { HiHome } from "react-icons/hi";
import { Link, useLocation } from "react-router";

const formatBreadcrumbSegment = (segment: string): string => {
  if (!segment) return "";
  // Add space before uppercase letters (for camelCase) then convert to lower case
  const spacedSegment = segment.replace(/([A-Z0-9])/g, " $1").toLowerCase();
  // Replace hyphens and underscores with spaces
  const withSpaces = spacedSegment.replace(/[-_]/g, " ");

  return withSpaces
    .split(" ")
    .filter((word) => word.length > 0) // Remove empty strings from multiple spaces
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .trim();
};

export function Breadcrumbs() {
  const location = useLocation();
  const { pathname } = location;

  const pathSegments = pathname.split("/").filter((x) => x);

  // If there are no segments (e.g., we are on a path Layout decided should have breadcrumbs,
  // but it's effectively a root-like page for a sub-section not yet deep enough for segments),
  // it might only show "Home". This is generally fine.
  // The main decision to show breadcrumbs at all is in Layout.tsx.

  return (
    <Breadcrumb
      aria-label="Page breadcrumbs"
      className="mb-4 rounded-md bg-gray-50 px-4 py-3 shadow-sm sm:px-6 dark:bg-gray-800"
    >
      <BreadcrumbItem icon={HiHome}>
        <Link
          to="/"
          className="text-blue-600 hover:underline dark:text-blue-400"
        >
          Home
        </Link>
      </BreadcrumbItem>

      {pathSegments.map((segment, index) => {
        const routeTo = `/${pathSegments.slice(0, index + 1).join("/")}`;
        const isLast = index === pathSegments.length - 1;
        let displayName = formatBreadcrumbSegment(segment);

        // Basic heuristic to avoid showing raw IDs as intermediate breadcrumb links
        // If it's the last segment and an ID, the page title should ideally reflect the item.
        const isObjectIdLike = (s: string) =>
          s.length === 24 && /^[a-f0-9]+$/i.test(s);
        const isUuidLike = (s: string) =>
          s.length === 36 &&
          /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(
            s,
          );

        if (!isLast && (isObjectIdLike(segment) || isUuidLike(segment))) {
          displayName = "Detail"; // Placeholder for ID-based routes
        }

        return (
          <BreadcrumbItem key={routeTo}>
            {isLast ? (
              <span className="text-gray-600 dark:text-gray-400">
                {displayName}
              </span>
            ) : (
              <Link
                to={routeTo}
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                {displayName}
              </Link>
            )}
          </BreadcrumbItem>
        );
      })}
    </Breadcrumb>
  );
}
