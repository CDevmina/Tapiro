import { Card } from "flowbite-react";
import { useUserProfile } from "../api/hooks/useUserHooks";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorDisplay from "../components/common/ErrorDisplay";

export default function UserDashboard() {
  const { data: profile, isLoading, error } = useUserProfile();

  if (isLoading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (error) {
    return (
      <ErrorDisplay
        title="Failed to load dashboard"
        message="Could not retrieve your profile information."
        error={error}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      {/* Add dark mode text color */}
      <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
        User Dashboard
      </h2>
      <Card>
        {/* Add dark mode text color */}
        <p className="mb-2 text-gray-700 dark:text-gray-400">
          Welcome back, {profile?.username || "User"}!
        </p>
        {/* Add dark mode text color */}
        <p className="text-gray-700 dark:text-gray-400">
          Here you can manage your preferences, control data sharing with
          stores, and view your usage analytics. (Content coming soon!)
        </p>
        {/* Add User Preference Management and Analytics sections later */}
      </Card>
    </div>
  );
}
