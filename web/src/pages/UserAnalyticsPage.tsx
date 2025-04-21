import {
  useUserActivitySummary,
  useSpendingAnalytics,
} from "../api/hooks/useUserHooks";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorDisplay from "../components/common/ErrorDisplay";
import {
  Card,
  Table,
  TableHeadCell,
  TableHead,
  TableBody,
  TableCell,
  TableRow,
} from "flowbite-react";
import {
  SpendingBreakdownItem,
  ActivityByStore,
} from "../api/types/data-contracts"; // Import types

export default function UserAnalyticsPage() {
  const {
    data: activitySummary,
    isLoading: activityLoading,
    error: activityError,
  } = useUserActivitySummary();
  const {
    data: spendingAnalytics,
    isLoading: spendingLoading,
    error: spendingError,
  } = useSpendingAnalytics();

  const isLoading = activityLoading || spendingLoading;
  const error = activityError || spendingError;

  if (isLoading) {
    return <LoadingSpinner message="Loading analytics data..." />;
  }

  if (error) {
    return (
      <ErrorDisplay
        title="Failed to load analytics"
        message="Could not retrieve your detailed analytics information."
        error={error}
      />
    );
  }

  // Add types to variables
  const apiUsageByStore: ActivityByStore[] =
    activitySummary?.recentApiUsage?.byStore || [];
  const submissionsByStore: ActivityByStore[] =
    activitySummary?.recentSubmissions?.byStore || [];
  const spendingBreakdown: SpendingBreakdownItem[] =
    spendingAnalytics?.spendingBreakdown || [];

  return (
    <div className="container mx-auto space-y-6 px-4 py-12">
      <h2 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
        Detailed Analytics
      </h2>
      <p className="mb-6 text-gray-600 dark:text-gray-400">
        Review detailed breakdowns of your data usage, submissions, and spending
        patterns. (More features like date filtering coming soon!)
      </p>

      {/* Data Usage Details */}
      <Card>
        <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          Data Usage by Stores (Last 30 Days)
        </h3>
        {apiUsageByStore.length > 0 ? (
          <Table hoverable>
            <TableHead>
              <TableHeadCell>Store Name</TableHeadCell>
              <TableHeadCell>Store ID</TableHeadCell>
              <TableHeadCell>API Calls</TableHeadCell>
            </TableHead>
            <TableBody className="divide-y">
              {apiUsageByStore.map(
                (
                  item, // Type is inferred from apiUsageByStore
                ) => (
                  <TableRow
                    key={item.storeId}
                    className="bg-white dark:border-gray-700 dark:bg-gray-800"
                  >
                    <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                      {item.name}
                    </TableCell>
                    <TableCell>{item.storeId}</TableCell>
                    <TableCell>{item.count}</TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-gray-500 italic dark:text-gray-400">
            No API usage data found for the last 30 days.
          </p>
        )}
      </Card>

      {/* Data Submission Details */}
      <Card>
        <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          Data Submissions by Stores (Last 30 Days)
        </h3>
        {submissionsByStore.length > 0 ? (
          <Table hoverable>
            <TableHead>
              <TableHeadCell>Store Name</TableHeadCell>
              <TableHeadCell>Store ID</TableHeadCell>
              <TableHeadCell>Submissions</TableHeadCell>
            </TableHead>
            <TableBody className="divide-y">
              {submissionsByStore.map(
                (
                  item, // Type is inferred from submissionsByStore
                ) => (
                  <TableRow
                    key={item.storeId}
                    className="bg-white dark:border-gray-700 dark:bg-gray-800"
                  >
                    <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                      {item.name}
                    </TableCell>
                    <TableCell>{item.storeId}</TableCell>
                    <TableCell>{item.count}</TableCell>
                  </TableRow>
                ),
              )}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-gray-500 italic dark:text-gray-400">
            No data submissions found for the last 30 days.
          </p>
        )}
      </Card>

      {/* Spending Breakdown Details */}
      <Card>
        <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
          Spending Breakdown by Category
        </h3>
        {spendingBreakdown.length > 0 ? (
          <Table hoverable>
            <TableHead>
              <TableHeadCell>Category Name</TableHeadCell>
              <TableHeadCell>Category ID</TableHeadCell>
              <TableHeadCell>Total Spent</TableHeadCell>
            </TableHead>
            <TableBody className="divide-y">
              {/* Add explicit type SpendingBreakdownItem to item */}
              {spendingBreakdown.map((item: SpendingBreakdownItem) => (
                <TableRow
                  key={item.categoryId}
                  className="bg-white dark:border-gray-700 dark:bg-gray-800"
                >
                  <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                    {item.categoryName}
                  </TableCell>
                  <TableCell>{item.categoryId}</TableCell>
                  <TableCell>${item.totalSpent.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <p className="text-sm text-gray-500 italic dark:text-gray-400">
            No spending data available.
          </p>
        )}
      </Card>
    </div>
  );
}
