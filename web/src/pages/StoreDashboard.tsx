import { Card } from "flowbite-react";
import { useStoreProfile } from "../api/hooks/useStoreHooks"; // Import the hook
import LoadingSpinner from "../components/common/LoadingSpinner"; // Import spinner
import ErrorDisplay from "../components/common/ErrorDisplay"; // Import error display

export default function StoreDashboard() {
  // Fetch store profile data
  const { data: storeProfile, isLoading, error } = useStoreProfile();

  // Handle Loading State
  if (isLoading) {
    return <LoadingSpinner message="Loading store dashboard..." />;
  }

  // Handle Error State
  if (error) {
    return (
      <ErrorDisplay
        title="Failed to load dashboard"
        message="Could not retrieve your store's profile information."
        error={error} // Pass the actual error object
      />
    );
  }

  // Render content when data is available
  return (
    <div className="container mx-auto px-4 py-12">
      <h2 className="mb-4">Store Dashboard - API Management</h2>
      <Card>
        <p className="mb-2 text-gray-700 dark:text-gray-400">
          Welcome, {storeProfile?.name || "Store Owner"}!
        </p>
        <p className="text-gray-700 dark:text-gray-400">
          Manage your API keys, view usage statistics, and access billing
          information here. (Content coming soon!)
        </p>
        {/* Add API Key Management, Analytics, and Billing sections later */}
        {/* Example: Displaying fetched data */}
        {/* <pre className="mt-4 text-xs">{JSON.stringify(storeProfile, null, 2)}</pre> */}
      </Card>
    </div>
  );
}
