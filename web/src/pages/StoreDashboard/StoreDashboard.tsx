import { useMemo } from "react"; // Removed useState, useEffect
import {
  Card,
  Tabs,
  TabItem,
  Button,
  Spinner, // Keep Spinner for initial load
} from "flowbite-react";
import {
  HiOutlineKey,
  HiOutlineInformationCircle,
  HiDocumentText,
  HiChartPie,
} from "react-icons/hi";
import { Link } from "react-router";
import {
  useStoreProfile,
  useApiKeys, // Still needed for Overview count
} from "../../api/hooks/useStoreHooks";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorDisplay from "../../components/common/ErrorDisplay";
// Import the new components
import { ApiKeyManagement } from "./ApiKeyManagement";
import { ApiUsageDashboard } from "./ApiUsageDashboard";

export default function StoreDashboard() {
  // --- Data Fetching (Only for Overview) ---
  const {
    data: storeProfile,
    isLoading: profileLoading,
    error: profileError,
  } = useStoreProfile();
  // Fetch keys here ONLY if needed for the overview count.
  // If ApiKeyManagement fetches its own keys, this can be removed
  // if the count isn't strictly needed on the overview tab initially.
  const {
    data: apiKeysData,
    isLoading: keysLoading, // Used for combined loading state
    error: keysError, // Used for combined error state
  } = useApiKeys();

  // --- Memos (Only for Overview) ---
  const activeKeyCount = useMemo(() => {
    return apiKeysData?.filter((key) => key.status === "active").length || 0;
  }, [apiKeysData]);

  // --- Removed State and Handlers for Keys/Usage ---

  // --- Loading and Error States (Combined for initial load) ---
  const isLoading = profileLoading || keysLoading;
  const error = profileError || keysError;

  if (isLoading) {
    return <LoadingSpinner message="Loading store dashboard..." />;
  }

  if (error) {
    return (
      <ErrorDisplay
        title="Failed to load dashboard"
        message="Could not retrieve store information."
        error={error}
      />
    );
  }

  return (
    // Removed relative positioning, toasts are now inside child components
    <div className="container mx-auto px-4 pb-12">
      <h2 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">
        Store Dashboard
      </h2>

      <Tabs aria-label="Store dashboard tabs" variant="underline">
        {/* Overview Tab */}
        <TabItem active title="Overview" icon={HiOutlineInformationCircle}>
          <div className="space-y-6 pt-4">
            <Card>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Welcome, {storeProfile?.name || "Store Owner"}!
              </h3>
              <p className="text-gray-700 dark:text-gray-400">
                Manage your API keys and view usage statistics here.
              </p>
            </Card>
            <Card>
              <h4 className="mb-2 text-lg font-medium text-gray-900 dark:text-white">
                API Key Summary
              </h4>
              {keysLoading ? ( // Show spinner if keys are still loading for count
                <Spinner size="sm" />
              ) : keysError ? (
                <span className="text-red-500">Error loading count</span>
              ) : (
                <p className="text-gray-700 dark:text-gray-400">
                  You currently have{" "}
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {activeKeyCount}
                  </span>{" "}
                  active API key(s).
                </p>
              )}
              <Link to="/api-docs" className="mt-4 inline-block">
                <Button color="blue" outline size="sm">
                  <HiDocumentText className="mr-2 h-5 w-5" />
                  View API Documentation
                </Button>
              </Link>
            </Card>
            {/* Add more overview widgets later */}
          </div>
        </TabItem>

        {/* API Keys Tab - Render the new component */}
        <TabItem title="API Keys" icon={HiOutlineKey}>
          <ApiKeyManagement />
        </TabItem>

        {/* API Usage Tab - Render the new component */}
        <TabItem title="API Usage" icon={HiChartPie}>
          <ApiUsageDashboard />
        </TabItem>

        {/* Add more tabs later (Analytics, etc.) */}
      </Tabs>

      {/* Removed Modals - they are now inside ApiKeyManagement */}
    </div>
  );
}
