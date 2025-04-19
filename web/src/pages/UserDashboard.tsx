import {
  Badge,
  Button,
  Card,
  List,
  ListItem, // Corrected import
  Spinner, // Added Spinner import
  Tooltip,
} from "flowbite-react";
import {
  HiOutlineBan,
  HiOutlineChartPie,
  HiOutlineClock,
  HiOutlineCog,
  HiOutlineCurrencyDollar,
  HiOutlineDocumentText,
  HiOutlineInformationCircle,
  HiOutlineShare,
} from "react-icons/hi";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { formatDistanceToNow } from "date-fns";

import {
  useUserProfile,
  useUserPreferences,
  useOptOutFromStore,
} from "../api/hooks/useUserHooks";
import {
  useUsageSummary,
  useSpendingAnalytics,
  useRecentData,
  useConsentingStores,
} from "../api/hooks/useDashboardHooks";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorDisplay from "../components/common/ErrorDisplay";

// Define colors for the pie chart
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FFC0CB", // Pink
  "#A52A2A", // Brown
  "#FFA500", // Orange
  "#800080", // Purple
];

export default function UserDashboard() {
  // Fetch profile and preferences
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useUserProfile();
  const {
    data: preferencesData,
    isLoading: preferencesLoading,
    error: preferencesError,
  } = useUserPreferences();

  // Fetch dashboard specific data
  const {
    data: usageSummary,
    isLoading: usageLoading,
    error: usageError,
  } = useUsageSummary();
  const {
    data: spendingAnalytics,
    isLoading: spendingLoading,
    error: spendingError,
  } = useSpendingAnalytics();
  const {
    data: recentData,
    isLoading: recentLoading,
    error: recentError,
  } = useRecentData(5); // Fetch last 5 entries
  const {
    data: consentingStores,
    isLoading: storesLoading,
    error: storesError,
  } = useConsentingStores();

  // Opt-out mutation
  const optOutMutation = useOptOutFromStore();

  const handleOptOut = (storeId: string) => {
    if (!storeId) return; // Prevent calling with empty string
    optOutMutation.mutate(storeId);
  };

  // Combined loading state
  const isLoading =
    profileLoading ||
    preferencesLoading ||
    usageLoading ||
    spendingLoading ||
    recentLoading ||
    storesLoading;

  // Find the first error encountered
  const firstError =
    profileError ||
    preferencesError ||
    usageError ||
    spendingError ||
    recentError ||
    storesError;

  if (isLoading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (firstError) {
    return (
      <ErrorDisplay
        title="Failed to load dashboard"
        message="Could not retrieve all dashboard information."
        error={firstError}
      />
    );
  }

  // Prepare data for Pie chart
  const chartData =
    spendingAnalytics?.categoryBreakdown
      ?.map((item, index) => ({
        name: item.categoryName || "Unknown",
        value: item.totalAmount || 0,
        fill: COLORS[index % COLORS.length], // Assign color
      }))
      .filter((item) => item.value > 0) || []; // Filter out zero-value items for cleaner chart

  return (
    <div className="container mx-auto px-4 py-12">
      <h2 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">
        Welcome, {profile?.username || "User"}!
      </h2>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* --- Usage Summary --- */}
        <Card className="col-span-1 lg:col-span-1">
          <h3 className="mb-3 flex items-center text-xl font-semibold text-gray-900 dark:text-white">
            <HiOutlineShare className="mr-2 h-6 w-6" />
            Data Usage Summary
          </h3>
          {usageSummary ? (
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-400">
              <p>
                Total Data Submissions by Stores:{" "}
                <Badge color="info" size="sm" className="ml-1 inline-block">
                  {usageSummary.totalDataSubmissions ?? 0}
                </Badge>
              </p>
              <p>
                Total Preference Requests by Stores:{" "}
                <Badge color="purple" size="sm" className="ml-1 inline-block">
                  {usageSummary.totalPreferenceRequests ?? 0}
                </Badge>
              </p>
              <h4 className="pt-2 text-base font-medium text-gray-800 dark:text-gray-300">
                Breakdown by Store:
              </h4>
              {usageSummary.storeBreakdown &&
              usageSummary.storeBreakdown.length > 0 ? (
                <List unstyled className="max-h-40 overflow-y-auto">
                  {usageSummary.storeBreakdown.map((store) => (
                    <ListItem // Corrected usage
                      key={store.storeId}
                      className="border-b border-gray-200 py-1 dark:border-gray-700"
                    >
                      <span className="font-medium">
                        {store.storeName || "Unknown Store"}
                      </span>
                      : {store.dataSubmissions ?? 0} submissions,{" "}
                      {store.preferenceRequests ?? 0} requests
                    </ListItem>
                  ))}
                </List>
              ) : (
                <p>No usage data available yet.</p>
              )}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              Loading usage data...
            </p>
          )}
        </Card>

        {/* --- Spending Analytics --- */}
        <Card className="col-span-1 lg:col-span-2">
          <h3 className="mb-3 flex items-center text-xl font-semibold text-gray-900 dark:text-white">
            <HiOutlineChartPie className="mr-2 h-6 w-6" />
            Spending Analytics
          </h3>
          {spendingAnalytics && chartData.length > 0 ? (
            <div className="h-64 w-full">
              <p className="mb-2 text-sm text-gray-700 dark:text-gray-400">
                Total Spent:{" "}
                <span className="font-semibold">
                  ${spendingAnalytics.totalSpent?.toFixed(2) ?? "0.00"}
                </span>
              </p>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    nameKey="name"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              No spending data available to display chart.
            </p>
          )}
        </Card>

        {/* --- Recent Activity --- */}
        <Card className="col-span-1 md:col-span-1">
          <h3 className="mb-3 flex items-center text-xl font-semibold text-gray-900 dark:text-white">
            <HiOutlineClock className="mr-2 h-6 w-6" />
            Recent Activity
          </h3>
          {recentData && recentData.length > 0 ? (
            <List unstyled>
              {recentData.map((entry) => (
                <ListItem // Corrected usage
                  key={entry.entryId}
                  className="mb-2 border-b border-gray-200 pb-2 dark:border-gray-700"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-800 dark:text-gray-300">
                      {entry.dataType === "purchase" ? (
                        <HiOutlineCurrencyDollar className="mr-1 inline h-4 w-4 text-green-500" />
                      ) : (
                        <HiOutlineDocumentText className="mr-1 inline h-4 w-4 text-blue-500" />
                      )}
                      {entry.summary} ({entry.storeName})
                    </span>
                    <Tooltip
                      content={new Date(
                        entry.timestamp || Date.now(),
                      ).toLocaleString()}
                    >
                      <span className="text-gray-500 dark:text-gray-400">
                        {formatDistanceToNow(
                          new Date(entry.timestamp || Date.now()),
                          { addSuffix: true },
                        )}
                      </span>
                    </Tooltip>
                  </div>
                </ListItem>
              ))}
            </List>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              No recent activity recorded.
            </p>
          )}
        </Card>

        {/* --- Consenting Stores --- */}
        <Card className="col-span-1 md:col-span-1">
          <h3 className="mb-3 flex items-center text-xl font-semibold text-gray-900 dark:text-white">
            <HiOutlineCog className="mr-2 h-6 w-6" />
            Manage Store Access
          </h3>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            Stores you are currently sharing data with:
          </p>
          {consentingStores && consentingStores.length > 0 ? (
            <List unstyled>
              {consentingStores.map((store) => (
                <ListItem // Corrected usage
                  key={store.storeId}
                  className="flex items-center justify-between border-b border-gray-200 py-2 dark:border-gray-700"
                >
                  <span className="text-gray-800 dark:text-gray-300">
                    {store.name || "Unknown Store"}
                  </span>
                  <Button
                    size="xs"
                    color="failure"
                    onClick={() => handleOptOut(store.storeId || "")}
                    disabled={
                      optOutMutation.isPending &&
                      optOutMutation.variables === store.storeId
                    } // Disable only the specific button being processed
                  >
                    {optOutMutation.isPending && // Conditionally render Spinner
                    optOutMutation.variables === store.storeId ? (
                      <Spinner size="xs" className="mr-1" />
                    ) : (
                      <HiOutlineBan className="mr-1 h-4 w-4" />
                    )}
                    Opt-Out
                  </Button>
                </ListItem>
              ))}
            </List>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              You are not currently opted-in to share data with any stores.
            </p>
          )}
          {/* Link to detailed preference/store management page */}
          {/* <Link to="/dashboard/user/preferences" className="mt-4 inline-block text-blue-600 hover:underline dark:text-blue-500">
            Go to detailed preference settings
          </Link> */}
        </Card>

        {/* --- Preference Summary --- */}
        <Card className="col-span-1 md:col-span-1">
          <h3 className="mb-3 flex items-center text-xl font-semibold text-gray-900 dark:text-white">
            <HiOutlineInformationCircle className="mr-2 h-6 w-6" />
            Preference Profile Summary
          </h3>
          {/* Check preferencesData and preferences array explicitly */}
          {preferencesData &&
          preferencesData.preferences &&
          preferencesData.preferences.length > 0 ? (
            <div className="space-y-1 text-sm text-gray-700 dark:text-gray-400">
              <p className="mb-2">Top Interests:</p>
              <List unstyled className="max-h-40 overflow-y-auto">
                {/* Safe to access preferences here */}
                {preferencesData.preferences
                  .slice() // Create a copy to sort
                  .sort((a, b) => (b.score ?? 0) - (a.score ?? 0)) // Use nullish coalescing for safety
                  .slice(0, 5) // Take top 5
                  .map((pref) => (
                    <ListItem // Corrected usage
                      key={pref.category}
                      className="border-b border-gray-200 py-1 dark:border-gray-700"
                    >
                      {pref.category} (Score: {pref.score?.toFixed(2) ?? "N/A"})
                    </ListItem>
                  ))}
              </List>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              No preference data available. Start interacting with stores to
              build your profile.
            </p>
          )}
          {/* Link to detailed preference editing page */}
          {/* <Link to="/dashboard/user/preferences" className="mt-4 inline-block text-blue-600 hover:underline dark:text-blue-500">
            Edit Preferences
          </Link> */}
        </Card>
      </div>
    </div>
  );
}
