import { useMemo, useState, useEffect } from "react";
import { Link } from "react-router"; // <-- Corrected import
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
  ListItem,
  Datepicker,
  Button,
} from "flowbite-react";
import {
  HiArrowRight,
  HiClock,
  HiInformationCircle,
  HiOutlineNewspaper,
  HiOutlineCurrencyDollar,
  HiOutlineShare,
  HiOutlineAdjustments,
  HiCalendar,
} from "react-icons/hi";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell,
} from "recharts";

import {
  useUserProfile,
  useRecentUserData,
  useSpendingAnalytics,
  useStoreConsentLists,
  useUserPreferences,
} from "../api/hooks/useUserHooks";
import { useLookupStores } from "../api/hooks/useStoreHooks";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorDisplay from "../components/common/ErrorDisplay";
import {
  RecentUserDataEntry,
  StoreBasicInfo,
  MonthlySpendingItem,
} from "../api/types/data-contracts";
import { InterestFormModal } from "../components/auth/InterestFormModal";

// Helper function to format date (keep existing)
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

// Define colors for the lines (can reuse or define new ones)
const LINE_COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82CA9D",
  "#FF5733",
  "#C70039",
  "#900C3F",
  "#581845",
];

// Helper to format currency (keep existing)
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD", // Adjust currency as needed
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

// Helper to format YYYY-MM date string for display
const formatMonth = (monthString: string) => {
  try {
    const [year, month] = monthString.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
  } catch {
    return monthString; // Fallback
  }
};

// Helper to format Date object to YYYY-MM-DD string
const formatDateToISO = (date: Date | null | undefined): string | undefined => {
  if (!date) return undefined;
  return date.toISOString().split("T")[0];
};

export default function UserDashboard() {
  // --- State for Date Range ---
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

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
  } = useRecentUserData(3); // <-- Changed limit from 5 to 3
  const {
    data: spendingData,
    isLoading: spendingLoading,
    error: spendingError,
  } = useSpendingAnalytics({
    startDate: formatDateToISO(startDate),
    endDate: formatDateToISO(endDate),
  });
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
  const optInStoreIds = useMemo(
    () => consentLists?.optInStores || [],
    [consentLists],
  );

  const {
    data: storeDetails,
    isLoading: storesLoading,
    error: storesError,
  } = useLookupStores(optInStoreIds);

  const storeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    storeDetails?.forEach((store: StoreBasicInfo) => {
      map.set(store.storeId, store.name || `Store ID: ${store.storeId}`);
    });
    return map;
  }, [storeDetails]);

  // --- Data Transformation for Spending Line Chart ---
  const { lineChartData, categories } = useMemo(() => {
    if (!spendingData) return { lineChartData: [], categories: [] };

    const allCategories = new Set<string>();
    const dataMap = new Map<string, Record<string, number | string>>();

    spendingData.forEach((monthlyItem: MonthlySpendingItem) => {
      const monthData: Record<string, number | string> = {
        month: monthlyItem.month,
      };
      Object.entries(monthlyItem.spending).forEach(([category, amount]) => {
        allCategories.add(category);
        monthData[category] = amount;
      });
      dataMap.set(monthlyItem.month, monthData);
    });

    const processedData = spendingData.map((item: MonthlySpendingItem) => {
      const monthEntry = dataMap.get(item.month) || { month: item.month };
      allCategories.forEach((cat) => {
        if (!(cat in monthEntry)) {
          monthEntry[cat] = 0;
        }
      });
      return monthEntry;
    });

    return {
      lineChartData: processedData,
      categories: Array.from(allCategories).sort(),
    };
  }, [spendingData]);

  // Data for Preferences Bar Chart
  const topPreferencesChartData = useMemo(() => {
    if (!preferencesData?.preferences) return [];
    return [...preferencesData.preferences]
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .slice(0, 5)
      .map((pref) => ({
        name: pref.category,
        score: pref.score != null ? pref.score * 100 : 0,
      }));
  }, [preferencesData]);

  // --- Loading and Error States (Checked AFTER hooks) ---
  const isLoading =
    profileLoading ||
    activityLoading ||
    spendingLoading ||
    consentLoading ||
    preferencesLoading ||
    storesLoading;

  const combinedError =
    profileError ||
    activityError ||
    spendingError ||
    consentError ||
    preferencesError ||
    storesError;

  const [showInterestForm, setShowInterestForm] = useState(false);

  useEffect(() => {
    // If preferences loaded and are empty, show the form
    if (
      !preferencesLoading &&
      preferencesData &&
      (!preferencesData.preferences || preferencesData.preferences.length === 0)
    ) {
      setShowInterestForm(true);
    }
  }, [preferencesData, preferencesLoading]);

  if (isLoading && !spendingData) {
    return <LoadingSpinner message="Loading your dashboard..." />;
  }

  if (combinedError && !spendingData) {
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
    <>
      <div className="container mx-auto px-4 py-8">
        <h2 className="mb-6 text-3xl font-bold text-gray-900 dark:text-white">
          Welcome back, {profile?.username || "User"}!
        </h2>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* --- Recent Activity Card --- */}
          <Card className="col-span-1 flex flex-col">
            <div className="flex-grow">
              <h3 className="mb-4 flex items-center text-xl font-semibold text-gray-900 dark:text-white">
                <HiOutlineNewspaper className="mr-2 h-5 w-5" />
                Recent Activity
              </h3>
              {activityError ? (
                <Alert color="failure" icon={HiInformationCircle}>
                  Could not load recent activity.
                </Alert>
              ) : !recentActivity || recentActivity.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  No recent activity found.
                </p>
              ) : (
                <div className="p-4">
                  <Timeline>
                    {recentActivity.map(
                      (
                        activity: RecentUserDataEntry, // No change needed here, map will iterate over 3 items max
                      ) => (
                        <TimelineItem key={activity._id}>
                          <TimelinePoint icon={HiClock} />
                          <TimelineContent>
                            <TimelineTime>
                              {formatDate(activity.timestamp)}
                            </TimelineTime>
                            <TimelineTitle>
                              {activity.dataType === "purchase"
                                ? "Purchase"
                                : "Search"}{" "}
                              from{" "}
                              {activity.storeId
                                ? storeNameMap.get(activity.storeId) ||
                                  `Store ID: ${activity.storeId}`
                                : "Unknown Store"}
                            </TimelineTitle>
                            {/* Add more details if needed */}
                            {/* <TimelineBody>Details about the activity...</TimelineBody> */}
                          </TimelineContent>
                        </TimelineItem>
                      ),
                    )}
                  </Timeline>
                </div>
              )}
            </div>
            <Link
              to="/profile/user/analytics"
              className="mt-4 inline-flex items-center self-start text-sm font-medium text-cyan-600 hover:underline dark:text-cyan-500"
            >
              View All Activity <HiArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Card>

          {/* --- Spending Overview Card --- */}
          <Card className="col-span-1 flex flex-col md:col-span-2">
            <div className="flex-grow">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <h3 className="flex items-center text-xl font-semibold text-gray-900 dark:text-white">
                  <HiOutlineCurrencyDollar className="mr-2 h-5 w-5" />
                  Spending Overview
                </h3>
                <div className="flex flex-row items-center gap-2">
                  <Datepicker
                    icon={HiCalendar}
                    value={startDate ?? undefined}
                    onChange={(date: Date | null) => setStartDate(date)}
                    maxDate={endDate || undefined}
                    className="w-full"
                    placeholder="Start Date"
                  />
                  <Datepicker
                    icon={HiCalendar}
                    value={endDate ?? undefined}
                    onChange={(date: Date | null) => setEndDate(date)}
                    minDate={startDate || undefined}
                    className="w-full"
                    placeholder="End Date"
                  />
                  {(startDate || endDate) && (
                    <Button
                      size="xs"
                      color="light"
                      onClick={() => {
                        setStartDate(null);
                        setEndDate(null);
                      }}
                      title="Clear date range"
                    >
                      Clear
                    </Button>
                  )}
                </div>
              </div>

              {spendingError ? (
                <Alert color="failure" icon={HiInformationCircle}>
                  Could not load spending data for the selected range.
                </Alert>
              ) : spendingLoading ? (
                <div className="flex h-[250px] items-center justify-center">
                  <LoadingSpinner message="Loading spending data..." />
                </div>
              ) : !lineChartData || lineChartData.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  No spending data available
                  {startDate || endDate ? " for this period" : " yet"}.
                </p>
              ) : (
                <div style={{ width: "100%", height: 300 }}>
                  <ResponsiveContainer>
                    <LineChart
                      data={lineChartData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" tickFormatter={formatMonth} />
                      <YAxis tickFormatter={formatCurrency} />
                      <Tooltip
                        formatter={(value: number) => formatCurrency(value)}
                        labelFormatter={formatMonth}
                      />
                      <Legend />
                      {categories.map((category, index) => (
                        <Line
                          key={category}
                          type="monotone"
                          dataKey={category}
                          stroke={LINE_COLORS[index % LINE_COLORS.length]}
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 6 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <Link
              to="/profile/user/analytics"
              className="mt-4 inline-flex items-center self-start text-sm font-medium text-cyan-600 hover:underline dark:text-cyan-500"
            >
              View Detailed Analytics <HiArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Card>

          {/* --- Data Sharing Card --- */}
          <Card className="col-span-1 flex flex-col">
            <div className="flex-grow">
              <h3 className="mb-4 flex items-center text-xl font-semibold text-gray-900 dark:text-white">
                <HiOutlineShare className="mr-2 h-5 w-5" />
                Data Sharing
              </h3>
              {consentError || storesError ? (
                <Alert color="failure" icon={HiInformationCircle}>
                  Could not load sharing status.
                </Alert>
              ) : (consentLists?.optInStores?.length ?? 0) === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  You are not currently sharing data with any stores.
                </p>
              ) : (
                <>
                  <p className="mb-3 text-gray-600 dark:text-gray-400">
                    You are sharing data with{" "}
                    {consentLists?.optInStores?.length} store(s):
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
            <Link
              to="/profile/user/sharing"
              className="mt-4 inline-flex items-center self-start text-sm font-medium text-cyan-600 hover:underline dark:text-cyan-500"
            >
              Manage Sharing Settings <HiArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Card>

          {/* --- Preferences Summary Card --- */}
          <Card className="col-span-1 flex flex-col md:col-span-2">
            <div className="flex-grow">
              <h3 className="mb-4 flex items-center text-xl font-semibold text-gray-900 dark:text-white">
                <HiOutlineAdjustments className="mr-2 h-5 w-5" />
                Top Preferences
              </h3>
              {preferencesError ? (
                <Alert color="failure" icon={HiInformationCircle}>
                  Could not load preferences data.
                </Alert>
              ) : preferencesLoading ? (
                <div className="flex h-[250px] items-center justify-center">
                  <LoadingSpinner message="Loading preferences..." />
                </div>
              ) : !topPreferencesChartData ||
                topPreferencesChartData.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400">
                  No preference data available yet.
                </p>
              ) : (
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      layout="vertical"
                      data={topPreferencesChartData}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis
                        type="number"
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                        fontSize={12}
                        tick={{ fill: "currentColor" }}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        fontSize={12}
                        tick={{ fill: "currentColor" }}
                      />
                      <Tooltip
                        formatter={(value: number) => `${value.toFixed(1)}%`}
                        cursor={{ fill: "rgba(156, 163, 175, 0.2)" }}
                        contentStyle={{
                          backgroundColor: "rgba(31, 41, 55, 0.9)",
                          borderColor: "rgba(75, 85, 99, 0.5)",
                          borderRadius: "0.375rem",
                        }}
                        itemStyle={{ color: "#e5e7eb" }}
                        labelStyle={{ color: "#f9fafb", fontWeight: "bold" }}
                      />
                      <Legend wrapperStyle={{ fontSize: "12px" }} />
                      <Bar dataKey="score" name="Preference Score">
                        {topPreferencesChartData.map((_entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={LINE_COLORS[index % LINE_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <Link
              to="/profile/user/preferences"
              className="mt-4 inline-flex items-center self-start text-sm font-medium text-cyan-600 hover:underline dark:text-cyan-500"
            >
              Manage All Preferences <HiArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Card>
        </div>
      </div>

      <InterestFormModal
        show={showInterestForm}
        onClose={() => setShowInterestForm(false)}
      />
    </>
  );
}
