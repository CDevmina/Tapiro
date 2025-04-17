import { Card } from "flowbite-react"; // Use Heading instead of Title
import { useUserProfile } from "../api/hooks/useUserHooks"; // Import the hook
import LoadingSpinner from "../components/common/LoadingSpinner"; // Import spinner
import ErrorDisplay from "../components/common/ErrorDisplay"; // Import error display

export default function UserDashboard() {
  // Fetch user profile data
  const { data: profile, isLoading, error } = useUserProfile();

  // Handle Loading State
  if (isLoading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  // Handle Error State
  if (error) {
    return (
      <ErrorDisplay
        title="Failed to load dashboard"
        message="Could not retrieve your profile information."
        error={error} // Pass the actual error object
      />
    );
  }

  // Render content when data is available
  return (
    <div className="container mx-auto px-4 py-12">
      <h2 className="mb-4">User Dashboard</h2>
      <Card>
        <p className="mb-2 text-gray-700 dark:text-gray-400">
          Welcome back, {profile?.username || "User"}!
        </p>
        <p className="text-gray-700 dark:text-gray-400">
          Here you can manage your preferences, control data sharing with
          stores, and view your usage analytics. (Content coming soon!)
        </p>
        {/* Add User Preference Management and Analytics sections later */}
        {/* Example: Displaying fetched data */}
        {/* <pre className="mt-4 text-xs">{JSON.stringify(profile, null, 2)}</pre> */}
      </Card>
    </div>
  );
}
