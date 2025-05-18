import React, { useState, useMemo, useEffect } from "react"; // <-- Import useState, useEffect
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
  Spinner,
  Tabs,
  TabItem,
} from "flowbite-react";
import {
  HiOutlineNewspaper,
  HiOutlineCurrencyDollar,
  HiOutlineShare,
  HiArrowRight,
  HiInformationCircle,
  HiOutlineSparkles,
  HiOutlineChartPie,
  HiOutlineOfficeBuilding, // Added store icon
  HiCalendar,
  HiClock,
  HiOutlineViewGrid,
  HiOutlineUserCircle,
  HiOutlineCake,
  HiOutlineGlobeAlt,
  HiOutlineCash,
} from "react-icons/hi";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip as RechartsTooltip, // Alias Tooltip to avoid conflict
  Legend as RechartsLegend, // Alias Legend
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import {
  useUserProfile,
  useRecentUserData,
  useSpendingAnalytics,
  useStoreConsentLists,
  useUserPreferences,
} from "../../api/hooks/useUserHooks";
import { useLookupStores } from "../../api/hooks/useStoreHooks";
import { useTaxonomy } from "../../api/hooks/useTaxonomyHooks";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorDisplay from "../../components/common/ErrorDisplay";
import {
  StoreBasicInfo,
  MonthlySpendingItem,
} from "../../api/types/data-contracts";
import { InterestFormModal } from "../../components/auth/InterestFormModal";

// --- Import Page Components ---
import UserPreferencesPage from "./UserPreferencesPage";
import UserDataSharingPage from "./UserDataSharingPage";
import UserAnalyticsPage from "./UserAnalyticsPage";
// --- End Import Page Components ---

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

// Define colors for the lines/pie slices (keep existing)
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

// Helper to format YYYY-MM date string for display (keep existing)
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

// Helper to format Date object to YYYY-MM-DD string (keep existing)
const formatDateToISO = (date: Date | null | undefined): string | undefined => {
  if (!date) return undefined;
  return date.toISOString().split("T")[0];
};

// Helper for Pie Chart Label Rendering (Optional, for better labels)
const RADIAN = Math.PI / 180;

// Define an interface for the label props
interface CustomizedLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  innerRadius: number;
  outerRadius: number;
  percent: number;
}

const renderCustomizedLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
}: CustomizedLabelProps) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent < 0.05) return null; // Don't render label for small slices

  return (
    <text
      x={x}
      y={y}
      fill="white"
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fontSize={12}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// --- Mini Demographic Card Component ---
interface DemoInfoCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number | null | undefined;
  isLoading?: boolean;
}

const DemoInfoCard: React.FC<DemoInfoCardProps> = ({
  icon: Icon,
  label,
  value,
  isLoading,
}) => (
  <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
    <Icon className="mr-3 h-6 w-6 flex-shrink-0 text-gray-500 dark:text-gray-400" />
    <div className="flex-grow">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {label}
      </p>
      {isLoading ? (
        <Spinner size="xs" />
      ) : (
        <p className="text-sm font-semibold text-gray-900 dark:text-white">
          {value || "Not set"}
        </p>
      )}
    </div>
  </div>
);
// --- End Mini Demographic Card Component ---

export default function UserDashboard() {
  // --- State for Active Tab ---
  const [activeTab, setActiveTab] = useState(0); // 0 = Overview, 1 = Profile, etc.

  // --- State for Date Range ---
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);

  // --- Function to clear date filters ---
  const clearDates = () => {
    setStartDate(null);
    setEndDate(null);
  };

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
  } = useRecentUserData({ limit: 3 });
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
  const {
    data: taxonomyData,
    isLoading: taxonomyLoading,
    error: taxonomyError,
  } = useTaxonomy(); // <-- Fetch taxonomy

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
        if (!(cat in monthEntry)) monthEntry[cat] = 0; // Ensure all categories exist for each month
      });
      return monthEntry;
    });

    return {
      lineChartData: processedData,
      categories: Array.from(allCategories).sort(),
    };
  }, [spendingData]);

  // --- Data Transformation for Preferences Pie Chart ---
  const preferencesPieChartData = useMemo(() => {
    if (
      !preferencesData?.preferences ||
      !taxonomyData?.categories ||
      preferencesData.preferences.length === 0 ||
      taxonomyData.categories.length === 0
    ) {
      return [];
    }

    // Build helper maps from taxonomy
    const categoryNameMap = new Map<string, string>();
    const parentMap = new Map<string, string | null>();
    taxonomyData.categories.forEach((cat) => {
      categoryNameMap.set(cat.id, cat.name);
      parentMap.set(cat.id, cat.parent_id || null);
    });

    // Function to find the top-level parent
    const getTopLevelCategory = (
      categoryId: string,
    ): { id: string; name: string } | null => {
      let currentId: string | null | undefined = categoryId; // Allow undefined
      let topLevelId: string = categoryId;
      let safety = 0; // Prevent infinite loops
      while (currentId != null && safety < 10) {
        // Check for null or undefined
        const parentId = parentMap.get(currentId);
        if (parentId == null) {
          // Check for null or undefined
          topLevelId = currentId; // Found the root
          break;
        }
        currentId = parentId;
        safety++;
      }
      const topLevelName = categoryNameMap.get(topLevelId);
      return topLevelName ? { id: topLevelId, name: topLevelName } : null;
    };

    // Aggregate scores by top-level category
    const aggregatedScores = new Map<string, { name: string; value: number }>(); // Use 'value' for PieChart
    preferencesData.preferences.forEach((pref) => {
      if (pref.category && pref.score != null) {
        // Use pref.category
        const topLevelCat = getTopLevelCategory(pref.category); // Use pref.category
        if (topLevelCat) {
          const current = aggregatedScores.get(topLevelCat.id) || {
            name: topLevelCat.name,
            value: 0, // Use 'value'
          };
          current.value += pref.score; // Add score to value
          aggregatedScores.set(topLevelCat.id, current);
        }
      }
    });

    // Convert map to array suitable for PieChart
    const chartData = Array.from(aggregatedScores.values());

    // Optional: Normalize scores to percentages if needed, or just use raw scores
    // For PieChart, raw values usually work fine as it calculates percentages internally.

    // Filter out items with zero or negative score if necessary
    return chartData.filter((item) => item.value > 0);
  }, [preferencesData, taxonomyData]);

  // --- Loading and Error States (Checked AFTER hooks) ---
  const isLoadingInitial =
    profileLoading ||
    activityLoading ||
    spendingLoading ||
    consentLoading ||
    preferencesLoading ||
    storesLoading ||
    taxonomyLoading; // Combined loading state for initial dashboard view

  const combinedError =
    profileError ||
    activityError ||
    spendingError ||
    consentError ||
    preferencesError ||
    storesError ||
    taxonomyError; // Combined error state

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

  // Show main spinner only if loading initial data for the overview
  if (isLoadingInitial && activeTab === 0) {
    return <LoadingSpinner message="Loading your dashboard..." />;
  }

  // Show main error only if error occurred and trying to view overview
  if (combinedError && activeTab === 0) {
    return (
      <ErrorDisplay
        title="Failed to load dashboard overview"
        message="Could not retrieve all dashboard information. Please try again later."
        error={combinedError}
      />
    );
  }

  // --- Render Dashboard ---
  return (
    <>
      <div className="container mx-auto px-4 py-12">
        <Tabs
          aria-label="User dashboard tabs"
          variant="underline"
          onActiveTabChange={(tab) => setActiveTab(tab)}
        >
          {/* Overview Tab */}
          <TabItem
            active={activeTab === 0}
            title="Overview"
            icon={HiOutlineViewGrid}
          >
            {activeTab === 0 && (
              <>
                {profileLoading ||
                activityLoading ||
                spendingLoading ||
                consentLoading ||
                preferencesLoading ||
                storesLoading ||
                taxonomyLoading ? (
                  <div className="pt-4">
                    <LoadingSpinner message="Loading overview data..." />
                  </div>
                ) : profileError ||
                  activityError ||
                  spendingError ||
                  consentError ||
                  preferencesError ||
                  storesError ||
                  taxonomyError ? (
                  <div className="pt-4">
                    <ErrorDisplay
                      title="Error Loading Overview"
                      message="Some overview data could not be loaded."
                      error={
                        profileError ||
                        activityError ||
                        spendingError ||
                        consentError ||
                        preferencesError ||
                        storesError ||
                        taxonomyError
                      }
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6 pt-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* --- Recent Activity Card --- */}
                    <Card className="col-span-1 flex flex-col lg:col-span-1">
                      <div className="flex-grow">
                        <h3 className="mb-4 flex items-center text-xl font-semibold text-gray-900 dark:text-white">
                          <HiOutlineNewspaper className="mr-2 h-5 w-5" />
                          Recent Activity
                        </h3>
                        {activityLoading ? (
                          <div className="flex h-full min-h-[150px] items-center justify-center">
                            <Spinner size="md" />
                          </div>
                        ) : activityError ? (
                          <Alert color="failure" icon={HiInformationCircle}>
                            Could not load recent activity.
                          </Alert>
                        ) : !recentActivity || recentActivity.length === 0 ? (
                          <p className="text-gray-500 dark:text-gray-400">
                            No recent activity recorded.
                          </p>
                        ) : (
                          <div className="p-4">
                            <Timeline>
                              {recentActivity.map((entry) => (
                                <TimelineItem key={entry._id}>
                                  <TimelinePoint icon={HiClock} />
                                  <TimelineContent>
                                    <TimelineTime>
                                      {formatDate(entry.timestamp)}
                                    </TimelineTime>
                                    <TimelineTitle className="capitalize">
                                      {entry.dataType}
                                      {entry.storeId &&
                                        ` at ${storeNameMap.get(entry.storeId) || "Unknown Store"}`}
                                    </TimelineTitle>
                                    {/* Further details can be added here if needed */}
                                  </TimelineContent>
                                </TimelineItem>
                              ))}
                            </Timeline>
                          </div>
                        )}
                      </div>
                      <Button
                        color="light"
                        size="sm"
                        className="mt-4 self-start"
                        onClick={() => setActiveTab(3)} // 3 = Analytics Tab Index
                      >
                        View Full Activity Log{" "}
                        <HiArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Card>

                    {/* --- Spending Overview Card --- */}
                    <Card className="col-span-1 flex flex-col md:col-span-2 lg:col-span-2">
                      <div className="flex-grow">
                        <h3 className="mb-4 flex items-center text-xl font-semibold text-gray-900 dark:text-white">
                          <HiOutlineCurrencyDollar className="mr-2 h-5 w-5" />
                          Spending Overview
                        </h3>
                        {/* Date Filters */}
                        <div className="mb-4 flex flex-wrap items-center gap-2">
                          <Datepicker
                            icon={HiCalendar}
                            value={startDate ?? undefined}
                            onChange={(date: Date | null) => setStartDate(date)}
                            maxDate={endDate || undefined}
                            placeholder="Start Date"
                            inputMode="none" // Prevent keyboard on mobile
                          />
                          <Datepicker
                            icon={HiCalendar}
                            value={endDate ?? undefined}
                            onChange={(date: Date | null) => setEndDate(date)}
                            minDate={startDate || undefined}
                            placeholder="End Date"
                            inputMode="none" // Prevent keyboard on mobile
                          />
                          {(startDate || endDate) && (
                            <Button
                              size="xs"
                              color="light"
                              onClick={clearDates}
                            >
                              Clear Dates
                            </Button>
                          )}
                        </div>
                        {/* Chart Area */}
                        {spendingError ? (
                          <Alert color="failure" icon={HiInformationCircle}>
                            Could not load spending data.
                          </Alert>
                        ) : spendingLoading ? (
                          <div className="flex h-[300px] items-center justify-center">
                            <Spinner size="lg" />
                          </div>
                        ) : !lineChartData || lineChartData.length === 0 ? (
                          <p className="py-4 text-center text-gray-500 dark:text-gray-400">
                            No spending data available
                            {startDate || endDate ? " for this period" : " yet"}
                            .
                          </p>
                        ) : (
                          <div style={{ width: "100%", height: 300 }}>
                            <ResponsiveContainer>
                              <LineChart
                                data={lineChartData}
                                margin={{
                                  top: 5,
                                  right: 30,
                                  left: 20,
                                  bottom: 5,
                                }}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                  dataKey="month"
                                  tickFormatter={formatMonth}
                                />
                                <YAxis tickFormatter={formatCurrency} />
                                <RechartsTooltip
                                  formatter={(value: number) =>
                                    formatCurrency(value)
                                  }
                                  labelFormatter={formatMonth}
                                />
                                <RechartsLegend />
                                {categories.map((category, index) => (
                                  <Line
                                    key={category}
                                    type="monotone"
                                    dataKey={category}
                                    stroke={
                                      LINE_COLORS[index % LINE_COLORS.length]
                                    }
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
                      <Button
                        color="light"
                        size="sm"
                        className="mt-4 self-start"
                        onClick={() => setActiveTab(3)} // 3 = Analytics Tab Index
                      >
                        View Detailed Analytics{" "}
                        <HiArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Card>

                    {/* --- Data Sharing Card --- */}
                    <Card className="col-span-1 flex flex-col md:col-span-2 lg:col-span-1">
                      <div className="flex-grow">
                        <h3 className="mb-4 flex items-center text-xl font-semibold text-gray-900 dark:text-white">
                          <HiOutlineShare className="mr-2 h-5 w-5" />
                          Data Sharing
                        </h3>
                        {consentLoading || storesLoading ? (
                          <div className="flex h-full min-h-[100px] items-center justify-center py-4">
                            <Spinner size="md" />
                          </div>
                        ) : consentError || storesError ? (
                          <Alert color="failure" icon={HiInformationCircle}>
                            Could not load sharing settings.
                          </Alert>
                        ) : (consentLists?.optInStores?.length ?? 0) === 0 ? (
                          <p className="text-gray-500 dark:text-gray-400">
                            You are not currently sharing data with any stores.
                          </p>
                        ) : (
                          <List unstyled className="space-y-3">
                            {" "}
                            {/* Increased spacing */}
                            {(consentLists?.optInStores ?? []).map(
                              (storeId) => (
                                <ListItem key={storeId} className="w-full">
                                  {" "}
                                  {/* Ensure ListItem takes full width */}
                                  <div className="flex items-center rounded-lg border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                                    <HiOutlineOfficeBuilding className="mr-3 h-6 w-6 flex-shrink-0 text-blue-600 dark:text-blue-500" />
                                    <div className="flex-grow">
                                      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                        Sharing data with
                                      </p>
                                      <p className="text-md font-semibold text-gray-900 dark:text-white">
                                        {storeNameMap.get(storeId) || storeId}
                                      </p>
                                    </div>
                                  </div>
                                </ListItem>
                              ),
                            )}
                          </List>
                        )}
                      </div>
                      <Button
                        color="light"
                        size="sm"
                        className="mt-4 self-start"
                        onClick={() => setActiveTab(2)} // 2 = Sharing Tab Index
                      >
                        Manage Sharing Settings{" "}
                        <HiArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Card>

                    {/* --- Top Interests Card --- */}
                    <Card className="col-span-1 flex flex-col md:col-span-2 lg:col-span-2">
                      <div className="flex-grow">
                        {/* New flex container for horizontal layout on md screens and up, vertical on sm */}
                        <div className="flex flex-col md:flex-row md:gap-6">
                          {/* Section 1: Top Interests */}
                          <div className="flex-1">
                            <h4 className="mb-2 text-base font-medium text-gray-700 dark:text-gray-300">
                              Top Interests
                            </h4>
                            {preferencesError || taxonomyError ? (
                              <Alert color="failure" icon={HiInformationCircle}>
                                Could not load preference data.
                              </Alert>
                            ) : preferencesLoading || taxonomyLoading ? (
                              <div className="flex h-[250px] items-center justify-center">
                                <Spinner>Loading preferences...</Spinner>
                              </div>
                            ) : !preferencesPieChartData ||
                              preferencesPieChartData.length === 0 ? (
                              <p className="flex h-[250px] items-center justify-center text-center text-gray-500 dark:text-gray-400">
                                No preference data available yet. Add interests
                                to see insights.
                              </p>
                            ) : (
                              <div className="h-[300px] w-full">
                                <ResponsiveContainer>
                                  <PieChart>
                                    <Pie
                                      data={preferencesPieChartData}
                                      cx="50%"
                                      cy="50%"
                                      labelLine={false}
                                      label={renderCustomizedLabel}
                                      outerRadius={100}
                                      fill="#8884d8"
                                      dataKey="value"
                                      nameKey="name"
                                    >
                                      {preferencesPieChartData.map(
                                        (_entry, index) => (
                                          <Cell
                                            key={`cell-${index}`}
                                            fill={
                                              LINE_COLORS[
                                                index % LINE_COLORS.length
                                              ]
                                            }
                                          />
                                        ),
                                      )}
                                    </Pie>
                                    <RechartsTooltip
                                      formatter={(value: number) =>
                                        `${Math.round(value * 100)}% Interest`
                                      }
                                    />
                                    <RechartsLegend />
                                  </PieChart>
                                </ResponsiveContainer>
                              </div>
                            )}
                          </div>

                          {/* Section 2: About You */}
                          {/* Removed original mt-6, border-t, pt-6 wrapper. Added mt-6 for small screens, md:mt-0 for larger */}
                          <div className="mt-6 flex-1 md:mt-0">
                            <h4 className="mb-4 text-base font-medium text-gray-700 dark:text-gray-300">
                              About You
                            </h4>
                            {profileError ? (
                              <Alert color="failure" icon={HiInformationCircle}>
                                Could not load profile information.
                              </Alert>
                            ) : profileLoading ? (
                              <div className="flex h-[250px] items-center justify-center">
                                <Spinner>Loading profile...</Spinner>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <DemoInfoCard
                                  icon={HiOutlineUserCircle}
                                  label="Gender"
                                  value={profile?.demographicData?.gender}
                                  isLoading={profileLoading}
                                />
                                <DemoInfoCard
                                  icon={HiOutlineCake}
                                  label="Age"
                                  value={profile?.demographicData?.age?.toString()}
                                  isLoading={profileLoading}
                                />
                                <DemoInfoCard
                                  icon={HiOutlineGlobeAlt}
                                  label="Country"
                                  value={profile?.demographicData?.country}
                                  isLoading={profileLoading}
                                />
                                <DemoInfoCard
                                  icon={HiOutlineCash}
                                  label="Income Bracket"
                                  value={
                                    profile?.demographicData?.incomeBracket
                                  }
                                  isLoading={profileLoading}
                                />
                              </div>
                            )}
                          </div>
                        </div>{" "}
                        {/* End of new flex container */}
                      </div>
                      <Button
                        color="light"
                        size="sm"
                        className="mt-4 self-start"
                        onClick={() => setActiveTab(1)} // 1 = Preferences Tab Index
                      >
                        Manage All Preferences{" "}
                        <HiArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </Card>
                  </div>
                )}
              </>
            )}
          </TabItem>

          {/* Preferences Tab */}
          <TabItem
            active={activeTab === 1}
            title="Preferences"
            icon={HiOutlineSparkles}
          >
            {activeTab === 1 && <UserPreferencesPage />}
          </TabItem>

          {/* Sharing Tab */}
          <TabItem
            active={activeTab === 2}
            title="Sharing"
            icon={HiOutlineShare}
          >
            {activeTab === 2 && <UserDataSharingPage />}
          </TabItem>

          {/* Analytics Tab */}
          <TabItem
            active={activeTab === 3}
            title="Analytics"
            icon={HiOutlineChartPie}
          >
            {activeTab === 3 && <UserAnalyticsPage />}
          </TabItem>
        </Tabs>
      </div>

      {/* Interest Form Modal (Keep outside tabs) */}
      <InterestFormModal
        show={showInterestForm}
        onClose={() => setShowInterestForm(false)}
      />
    </>
  );
}
