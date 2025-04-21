import {
  useUserProfile,
  useUserActivitySummary,
  useSpendingAnalytics,
  useUserPreferences,
} from "../api/hooks/useUserHooks";
import { useTaxonomy } from "../api/hooks/useSystemHooks";
import { Link } from "react-router"; // Correct import for react-router v6+
import {
  Card,
  List,
  ListItem,
  Progress,
  Button, // Import Button
} from "flowbite-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorDisplay from "../components/common/ErrorDisplay";
import { SpendingBreakdownItem } from "../api/types/data-contracts";
import { HiArrowRight } from "react-icons/hi"; // Import icon

// Define some colors for the pie chart
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82ca9d",
  "#FA8072",
  "#7D3C98",
];

export default function UserDashboard() {
  // Fetch all necessary data
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useUserProfile();
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
  const {
    data: userPreferences,
    isLoading: preferencesLoading,
    error: preferencesError,
  } = useUserPreferences();
  const {
    data: taxonomyData,
    isLoading: taxonomyLoading,
    error: taxonomyError,
  } = useTaxonomy();

  // Combined loading and error states
  const isLoading =
    profileLoading ||
    activityLoading ||
    spendingLoading ||
    preferencesLoading ||
    taxonomyLoading;
  const error =
    profileError ||
    activityError ||
    spendingError ||
    preferencesError ||
    taxonomyError;

  // Create taxonomy map once data is loaded
  const taxonomyMap =
    !taxonomyLoading && taxonomyData?.categories
      ? taxonomyData.categories.reduce(
          (map, cat) => {
            map[cat.id] = cat.name;
            return map;
          },
          {} as Record<string, string>,
        )
      : {};

  if (isLoading) {
    return <LoadingSpinner message="Loading dashboard..." />;
  }

  if (error) {
    return (
      <ErrorDisplay
        title="Failed to load dashboard"
        message="Could not retrieve your dashboard information."
        error={error}
      />
    );
  }

  // Prepare data for spending chart - ensure value is a number
  const spendingChartData =
    spendingAnalytics?.spendingBreakdown
      ?.map((item: SpendingBreakdownItem) => ({
        name: taxonomyMap[item.categoryId] || item.categoryName, // Use taxonomy map for name
        value: Number(item.totalSpent) || 0, // Ensure value is a number
      }))
      .filter((item) => item.value > 0) // Filter out zero-value items for cleaner chart
      .sort((a, b) => b.value - a.value) || []; // Sort descending

  // Prepare simplified preference overview
  const preferenceOverview =
    userPreferences?.preferences
      ?.slice(0, 5) // Take top 5 based on score (assuming sorted)
      .sort((a, b) => b.score - a.score) || []; // Ensure sorted by score desc

  return (
    <div className="container mx-auto space-y-6 px-4 py-12">
      <h2 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">
        Welcome, {profile?.username || "User"}!
      </h2>

      {/* Grid layout for cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Activity Summary Card */}
        <Card>
          <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
            Recent Activity (Last 30 Days)
          </h3>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-700 dark:text-gray-300">
                Data Usage by Stores
              </h4>
              <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                Total API calls:{" "}
                <span className="font-semibold">
                  {activitySummary?.recentApiUsage?.total ?? 0}
                </span>
              </p>
              {activitySummary?.recentApiUsage?.byStore &&
              activitySummary.recentApiUsage.byStore.length > 0 ? (
                <List unstyled className="text-sm">
                  {activitySummary.recentApiUsage.byStore
                    .slice(0, 3) // Show top 3
                    .map((item) => (
                      <ListItem
                        key={item.storeId}
                        className="text-gray-600 dark:text-gray-400"
                      >
                        {item.name}: {item.count} call(s)
                      </ListItem>
                    ))}
                  {activitySummary.recentApiUsage.byStore.length > 3 && (
                    <ListItem className="text-gray-500 italic dark:text-gray-500">
                      ... and others
                    </ListItem>
                  )}
                </List>
              ) : (
                <p className="text-sm text-gray-500 italic dark:text-gray-400">
                  No recent API usage detected.
                </p>
              )}
            </div>
            <hr className="my-3 border-gray-200 dark:border-gray-700" />
            <div>
              <h4 className="font-medium text-gray-700 dark:text-gray-300">
                New Data Submissions
              </h4>
              <p className="mb-1 text-sm text-gray-500 dark:text-gray-400">
                Total submissions:{" "}
                <span className="font-semibold">
                  {activitySummary?.recentSubmissions?.total ?? 0}
                </span>
              </p>
              {activitySummary?.recentSubmissions?.byStore &&
              activitySummary.recentSubmissions.byStore.length > 0 ? (
                <List unstyled className="text-sm">
                  {activitySummary.recentSubmissions.byStore
                    .slice(0, 3) // Show top 3
                    .map((item) => (
                      <ListItem
                        key={item.storeId}
                        className="text-gray-600 dark:text-gray-400"
                      >
                        {item.name}: {item.count} submission(s)
                      </ListItem>
                    ))}
                  {activitySummary.recentSubmissions.byStore.length > 3 && (
                    <ListItem className="text-gray-500 italic dark:text-gray-500">
                      ... and others
                    </ListItem>
                  )}
                </List>
              ) : (
                <p className="text-sm text-gray-500 italic dark:text-gray-400">
                  No recent data submissions detected.
                </p>
              )}
            </div>
          </div>
          <div className="mt-4 text-right">
            <Button
              as={Link}
              to="/profile/user/analytics"
              size="sm"
              color="light" // Use light color for secondary action
            >
              View Detailed Analytics
              <HiArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* Spending Analytics Card */}
        <Card>
          <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
            Spending Patterns (All Time)
          </h3>
          {spendingChartData.length > 0 ? (
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Tooltip
                    formatter={(value: number) => `$${value.toFixed(2)}`}
                  />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                  />
                  <Pie
                    data={spendingChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    // Simple label inside slice for smaller charts
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {spendingChartData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[300px] items-center justify-center">
              <p className="text-center text-sm text-gray-500 italic dark:text-gray-400">
                No spending data available to display chart.
              </p>
            </div>
          )}
          <div className="mt-4 text-right">
            {/* Link to analytics page is already in the Activity card, maybe remove duplicate? Or keep for consistency */}
            <Button
              as={Link}
              to="/profile/user/analytics#spending" // Link to specific section if possible
              size="sm"
              color="light"
            >
              View Spending Details
              <HiArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* Preference Profile Overview Card */}
        <Card>
          <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
            Your Preference Profile (Top 5)
          </h3>
          {preferenceOverview.length > 0 ? (
            <List unstyled className="space-y-3">
              {preferenceOverview.map((pref) => (
                <ListItem key={pref.category}>
                  <div className="mb-1 flex justify-between">
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">
                      {taxonomyMap[pref.category] || pref.category}
                    </span>
                    <span className="text-sm font-medium text-cyan-700 dark:text-cyan-500">
                      {(pref.score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress
                    progress={pref.score * 100}
                    size="sm"
                    color="cyan"
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <p className="text-sm text-gray-500 italic dark:text-gray-400">
              No preferences generated yet. Start interacting with services!
            </p>
          )}
          <div className="mt-4 text-right">
            <Button
              as={Link}
              to="/profile/user/preferences"
              size="sm"
              color="light"
            >
              Manage All Preferences
              <HiArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* Consent Management Link Card */}
        <Card>
          <h3 className="mb-3 text-xl font-semibold text-gray-900 dark:text-white">
            Data Sharing Control
          </h3>
          <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
            Review and manage which stores can access your data for personalized
            experiences.
          </p>
          <div className="mt-auto pt-4 text-right">
            {" "}
            {/* Push button to bottom */}
            <Button
              as={Link}
              to="/profile/user/consent"
              size="sm"
              color="light"
            >
              Manage Store Consent
              <HiArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
