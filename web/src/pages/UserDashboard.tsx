import { useMemo } from "react"; // <-- Import React
import { Link } from "react-router"; // <-- Correct import
import {
  Card,
  Alert,
  List,
  Timeline,
  TimelineItem,
  TimelinePoint,
  TimelineContent,
  TimelineTime,
  TimelineTitle,
  TimelineBody,
  ListItem,
} from "flowbite-react"; // <-- Keep existing imports
import {
  HiArrowRight,
  HiClock,
  HiInformationCircle,
  HiOutlineNewspaper, // Icon for activity
  HiOutlineCurrencyDollar, // Icon for spending
  HiOutlineShare, // Icon for sharing
  HiOutlineAdjustments, // Icon for preferences
} from "react-icons/hi";
// Import Recharts components - Added BarChart, XAxis, YAxis, CartesianGrid, Bar, Legend
import {
  ResponsiveContainer,
  BarChart, // Changed from PieChart
  Bar, // Added Bar
  XAxis, // Added XAxis
  YAxis, // Added YAxis
  CartesianGrid, // Added CartesianGrid
  Tooltip,
  Legend, // Added Legend
  Cell, // Keep Cell for color mapping if needed later, but maybe not for BarChart
} from "recharts";

import {
  useUserProfile,
  useRecentUserData,
  useSpendingAnalytics,
  useStoreConsentLists,
  useUserPreferences,
} from "../api/hooks/useUserHooks";
import { useLookupStores } from "../api/hooks/useStoreHooks"; // Import useLookupStores
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorDisplay from "../components/common/ErrorDisplay";
import {
  RecentUserDataEntry,
  StoreBasicInfo, // <-- Import StoreBasicInfo
  PreferenceItem, // <-- Import PreferenceItem
} from "../api/types/data-contracts"; // Import types

// Helper function to format date
const formatDate = (dateString: string | Date | undefined) => {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

// Define colors for the pie chart (can be reused or adapted for BarChart)
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
];

// Helper to format currency for Tooltip/Axis
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD", // Adjust currency as needed
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

export default function UserDashboard() {
  // --- Fetch Data (Hooks called unconditionally at the top) ---
  const {
    data: profile,
    isLoading: profileLoading,
    error: profileError,
  } = useUserProfile();
  const {
    data: recentActivity,
    isLoading: activityLoading,
    error: activityError,
  } = useRecentUserData(5); // Fetch latest 5 activities
  const {
    data: spendingData,
    isLoading: spendingLoading,
    error: spendingError,
  } = useSpendingAnalytics();
  const {
    data: consentLists,
    isLoading: consentLoading,
    error: consentError,
  } = useStoreConsentLists();
  const {
    data: preferencesData,
    isLoading: preferencesLoading,
    error: preferencesError,
  } = useUserPreferences();

  // --- Prepare Derived Data (useMemo hooks called unconditionally) ---
  // Note: Hooks now handle potentially undefined data internally

  const optInStoreIds = useMemo(
    () => consentLists?.optInStores || [], // Handle undefined consentLists
    [consentLists],
  );

  const {
    data: storeDetails,
    isLoading: storesLoading,
    error: storesError,
  } = useLookupStores(optInStoreIds); // Hook call is unconditional

  const storeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    // Handle undefined storeDetails
    storeDetails?.forEach((store: StoreBasicInfo) => {
      // <-- Add type annotation
      map.set(store.storeId, store.name || `Store ID: ${store.storeId}`);
    });
    return map;
  }, [storeDetails]);

  // Data for Spending Bar Chart
  const spendingChartData = useMemo(() => {
    if (!spendingData) return []; // Handle undefined spendingData
    return Object.entries(spendingData)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [spendingData]);

  // Data for Preferences Bar Chart
  const topPreferencesChartData = useMemo(() => {
    if (!preferencesData?.preferences) return []; // Handle undefined preferencesData
    return (
      [...preferencesData.preferences]
        .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
        .slice(0, 5)
        // Format for BarChart (horizontal)
        .map((pref) => ({
          name: pref.category, // Use category name for the axis label
          score: pref.score * 100, // Convert score to percentage for display
        }))
    );
  }, [preferencesData]);

  // --- Loading and Error States (Checked AFTER hooks) ---
  const isLoading =
    profileLoading ||
    activityLoading ||
    spendingLoading ||
    consentLoading ||
    preferencesLoading ||
    storesLoading;

  const combinedError = // Combine errors for a single display if needed
    profileError ||
    activityError ||
    spendingError ||
    consentError ||
    preferencesError ||
    storesError;

  if (isLoading) {
    return <LoadingSpinner message="Loading your dashboard..." />;
  }

  // Display a general error if any query failed
  if (combinedError) {
    return (
      <ErrorDisplay
        title="Failed to load dashboard"
        message="Could not retrieve all dashboard information. Please try again later."
        error={combinedError}
      />
    );
  }

  // --- Render Dashboard ---
  return (
    <div className="container mx-auto px-4 py-8">
      <h2 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">
        Welcome back, {profile?.username || "User"}!
      </h2>

      {/* Adjusted grid layout */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* --- Recent Activity Card --- Adjusted span */}
        <Card className="col-span-1 flex flex-col">
          {" "}
          {/* Changed lg:col-span-2 to col-span-1, added flex flex-col */}
          <div className="flex-grow">
            {" "}
            {/* Added flex-grow to push link down */}
            <h3 className="mb-4 flex items-center text-xl font-semibold text-gray-900 dark:text-white">
              {" "}
              {/* Added mb-4 */}
              <HiOutlineNewspaper className="mr-2 h-5 w-5" />
              Recent Activity
            </h3>
            {activityError ? ( // Show specific error if only this section failed
              <Alert color="failure" icon={HiInformationCircle}>
                Could not load recent activity.
              </Alert>
            ) : !recentActivity || recentActivity.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                No recent activity found.
              </p>
            ) : (
              <Timeline>
                {recentActivity.map((activity: RecentUserDataEntry) => (
                  <TimelineItem key={activity._id}>
                    <TimelinePoint icon={HiClock} />
                    <TimelineContent>
                      <TimelineTime>
                        {formatDate(activity.timestamp)}
                      </TimelineTime>
                      <TimelineTitle className="text-base">
                        {activity.dataType === "purchase"
                          ? "Purchase Data Submitted"
                          : "Search Data Submitted"}
                      </TimelineTitle>
                      <TimelineBody className="text-sm text-gray-600 dark:text-gray-400">
                        From:{" "}
                        {activity.storeId
                          ? storeNameMap.get(activity.storeId) ||
                            `Store ID: ${activity.storeId}`
                          : "Unknown Store"}
                      </TimelineBody>
                    </TimelineContent>
                  </TimelineItem>
                ))}
              </Timeline>
            )}
          </div>
          {/* Moved Link to the bottom */}
          <Link
            to="/profile/user/analytics"
            className="mt-4 inline-flex items-center self-start text-sm font-medium text-cyan-600 hover:underline dark:text-cyan-500" // Added self-start
          >
            View All Activity <HiArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Card>

        {/* --- Spending Overview Card --- Adjusted span and chart type */}
        <Card className="col-span-1 flex flex-col md:col-span-2">
          {" "}
          {/* Changed col-span-1 to md:col-span-2, added flex flex-col */}
          <div className="flex-grow">
            {" "}
            {/* Added flex-grow */}
            <h3 className="mb-4 flex items-center text-xl font-semibold text-gray-900 dark:text-white">
              {" "}
              {/* Added mb-4 */}
              <HiOutlineCurrencyDollar className="mr-2 h-5 w-5" />
              Spending Overview
            </h3>
            {spendingError ? ( // Show specific error
              <Alert color="failure" icon={HiInformationCircle}>
                Could not load spending data.
              </Alert>
            ) : !spendingChartData || spendingChartData.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                No spending data available yet.
              </p>
            ) : (
              // Changed to BarChart
              <div style={{ width: "100%", height: 250 }}>
                <ResponsiveContainer>
                  <BarChart
                    data={spendingChartData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={formatCurrency} />
                    <Tooltip
                      formatter={(value: number) => formatCurrency(value)}
                    />
                    <Legend />
                    <Bar dataKey="value" name="Total Spent" fill="#8884d8">
                      {spendingChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          {/* Moved Link to the bottom */}
          <Link
            to="/profile/user/analytics"
            className="mt-4 inline-flex items-center self-start text-sm font-medium text-cyan-600 hover:underline dark:text-cyan-500" // Added self-start
          >
            View Detailed Analytics <HiArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Card>

        {/* --- Data Sharing Card --- */}
        <Card className="col-span-1 flex flex-col">
          {" "}
          {/* Added flex flex-col */}
          <div className="flex-grow">
            {" "}
            {/* Added flex-grow */}
            <h3 className="mb-4 flex items-center text-xl font-semibold text-gray-900 dark:text-white">
              {" "}
              {/* Added mb-4 */}
              <HiOutlineShare className="mr-2 h-5 w-5" />
              Data Sharing
            </h3>
            {consentError || storesError ? ( // Show specific error
              <Alert color="failure" icon={HiInformationCircle}>
                Could not load sharing status.
              </Alert>
            ) : // Use optional chaining and nullish coalescing for safety
            (consentLists?.optInStores?.length ?? 0) === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                You are not currently sharing data with any stores.
              </p>
            ) : (
              <>
                <p className="mb-3 text-gray-600 dark:text-gray-400">
                  You are sharing data with {consentLists?.optInStores?.length}{" "}
                  store(s):
                </p>
                <List unstyled className="space-y-1">
                  {consentLists?.optInStores?.slice(0, 5).map((storeId) => (
                    <ListItem
                      key={storeId}
                      className="text-gray-700 dark:text-gray-300"
                    >
                      {storeNameMap.get(storeId) || `Store ID: ${storeId}`}
                    </ListItem>
                  ))}
                  {(consentLists?.optInStores?.length ?? 0) > 5 && (
                    <ListItem className="text-gray-500 dark:text-gray-400">
                      ... and more
                    </ListItem>
                  )}
                </List>
              </>
            )}
          </div>
          {/* Moved Link to the bottom */}
          <Link
            to="/profile/user/sharing"
            className="mt-4 inline-flex items-center self-start text-sm font-medium text-cyan-600 hover:underline dark:text-cyan-500" // Added self-start
          >
            Manage Sharing Settings <HiArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Card>

        {/* --- Preferences Summary Card --- Adjusted span and content */}
        <Card className="col-span-1 flex flex-col md:col-span-2">
          {" "}
          {/* Changed lg:col-span-2 to md:col-span-2, added flex flex-col */}
          <div className="flex-grow">
            {" "}
            {/* Added flex-grow */}
            <h3 className="mb-4 flex items-center text-xl font-semibold text-gray-900 dark:text-white">
              {" "}
              {/* Added mb-4 */}
              <HiOutlineAdjustments className="mr-2 h-5 w-5" />
              Your Top Preferences
            </h3>
            {preferencesError ? ( // Show specific error
              <Alert color="failure" icon={HiInformationCircle}>
                Could not load preferences.
              </Alert>
            ) : !topPreferencesChartData ||
              topPreferencesChartData.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400">
                No preferences set yet.
              </p>
            ) : (
              // Changed to Horizontal BarChart
              <div style={{ width: "100%", height: 250 }}>
                <ResponsiveContainer>
                  <BarChart
                    layout="vertical" // Make it horizontal
                    data={topPreferencesChartData}
                    margin={{ top: 5, right: 30, left: 30, bottom: 5 }} // Adjust margins for labels
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} unit="%" />{" "}
                    {/* Score axis */}
                    <YAxis dataKey="name" type="category" width={100} />{" "}
                    {/* Category axis */}
                    <Tooltip
                      formatter={(value: number) => `${value.toFixed(0)}%`}
                    />
                    {/* <Legend /> */}
                    <Bar dataKey="score" name="Preference Score" fill="#00C49F">
                      {topPreferencesChartData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
          {/* Moved Link to the bottom */}
          <Link
            to="/profile/user/preferences"
            className="mt-4 inline-flex items-center self-start text-sm font-medium text-cyan-600 hover:underline dark:text-cyan-500" // Added self-start
          >
            Manage All Preferences <HiArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Card>

        {/* --- Quick Links/Actions Card (Optional - Uncomment to use Button/Icons) --- */}
        {/* <Card className="col-span-1">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Quick Links</h3>
          <div className="flex flex-col space-y-2">
             <Button as={Link} to="/profile/user" color="light" className="w-full justify-start">
               <HiUserCircle className="mr-2 h-5 w-5" /> View Profile
             </Button>
             <Button as={Link} to="/profile/user/preferences" color="light" className="w-full justify-start">
               <HiCog className="mr-2 h-5 w-5" /> Edit Preferences
             </Button>
             <Button as={Link} to="/profile/user/sharing" color="light" className="w-full justify-start">
               <HiShare className="mr-2 h-5 w-5" /> Manage Sharing
             </Button>
          </div>
        </Card> */}
      </div>
    </div>
  );
}
