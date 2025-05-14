import React, { useState, useMemo } from "react"; // Added useEffect
import {
  Card,
  Datepicker,
  Button,
  Spinner,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeadCell,
  TextInput,
  Select,
  Label,
} from "flowbite-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import {
  HiCalendar,
  HiOutlineSearch,
  HiChevronLeft,
  HiChevronRight,
} from "react-icons/hi";
import {
  useRecentUserData,
  useSpendingAnalytics,
} from "../../api/hooks/useUserHooks";
import { useLookupStores } from "../../api/hooks/useStoreHooks";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorDisplay from "../../components/common/ErrorDisplay";
import {
  RecentUserDataEntry, // Keep this import now
  StoreBasicInfo,
  MonthlySpendingItem,
  GetRecentUserDataParams,
  PurchaseItem, // Assuming PurchaseItem is the type for purchase details items
  PurchaseEntry, // <-- Import PurchaseEntry
  SearchEntry, // Assuming SearchEntry is the type for search details
} from "../../api/types/data-contracts";

// --- Helper Functions (Keep existing) ---
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

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

const formatMonth = (monthString: string) => {
  try {
    const [year, month] = monthString.split("-");
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
    });
  } catch {
    return monthString;
  }
};

const formatDateToISO = (date: Date | null | undefined): string | undefined => {
  if (!date) return undefined;
  return date.toISOString().split("T")[0];
};

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
// --- End Helper Functions ---

const UserAnalyticsPage: React.FC = () => {
  // --- State for Filters ---
  const [spendingStartDate, setSpendingStartDate] = useState<Date | null>(null);
  const [spendingEndDate, setSpendingEndDate] = useState<Date | null>(null);
  const [activityStartDate, setActivityStartDate] = useState<Date | null>(null);
  const [activityEndDate, setActivityEndDate] = useState<Date | null>(null);
  const [activityDataType, setActivityDataType] =
    useState<GetRecentUserDataParams["dataType"]>(undefined); // Initialize with undefined
  const [activitySearchTerm, setActivitySearchTerm] = useState<string>("");
  const [activityPage, setActivityPage] = useState<number>(1);
  const activityLimit = 15; // Items per page

  // --- Data Fetching ---
  const {
    data: spendingData,
    isLoading: spendingLoading,
    error: spendingError,
  } = useSpendingAnalytics({
    startDate: formatDateToISO(spendingStartDate),
    endDate: formatDateToISO(spendingEndDate),
  });

  const activityParams: GetRecentUserDataParams = useMemo(
    () => ({
      limit: activityLimit,
      page: activityPage,
      startDate: formatDateToISO(activityStartDate),
      endDate: formatDateToISO(activityEndDate),
      dataType: activityDataType || undefined,
      searchTerm: activitySearchTerm || undefined,
    }),
    [
      activityPage,
      activityStartDate,
      activityEndDate,
      activityDataType,
      activitySearchTerm,
    ],
  );

  const {
    data: activityData,
    isLoading: activityLoading,
    error: activityError,
    isPlaceholderData, // Check if data is placeholder (useful for disabling next)
  } = useRecentUserData(activityParams);

  const activityStoreIds = useMemo(() => {
    const ids = new Set<string>();
    activityData?.forEach((entry) => {
      if (entry.storeId) ids.add(entry.storeId);
    });
    return Array.from(ids);
  }, [activityData]);

  const {
    data: storeDetails,
    isLoading: storesLoading,
    error: storesError,
  } = useLookupStores(activityStoreIds);

  // --- Memos (Keep existing) ---
  const storeNameMap = useMemo(() => {
    const map = new Map<string, string>();
    storeDetails?.forEach((store: StoreBasicInfo) => {
      map.set(store.storeId, store.name || `Store ID: ${store.storeId}`);
    });
    return map;
  }, [storeDetails]);

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
        if (!(cat in monthEntry)) monthEntry[cat] = 0;
      });
      return monthEntry;
    });
    return {
      lineChartData: processedData,
      categories: Array.from(allCategories).sort(),
    };
  }, [spendingData]);

  // --- Handlers (Keep existing) ---
  const clearSpendingDates = () => {
    setSpendingStartDate(null);
    setSpendingEndDate(null);
  };

  const clearActivityFilters = () => {
    setActivityStartDate(null);
    setActivityEndDate(null);
    setActivityDataType(undefined); // Reset to undefined
    setActivitySearchTerm("");
    setActivityPage(1);
  };

  // --- Pagination Logic ---
  // Determine if there might be a next page
  // We infer this if the current page loaded the maximum number of items
  const hasMoreData = useMemo(() => {
    return activityData && activityData.length === activityLimit;
  }, [activityData, activityLimit]);

  const handlePreviousPage = () => {
    if (activityPage > 1) {
      setActivityPage((prevPage) => prevPage - 1);
    }
  };

  const handleNextPage = () => {
    if (hasMoreData) {
      setActivityPage((prevPage) => prevPage + 1);
    }
  };
  // --- End Pagination Logic ---

  // --- Render Logic ---
  const isLoading = spendingLoading || activityLoading || storesLoading;
  // Remove combinedError
  // const combinedError = spendingError || activityError || storesError;

  if (isLoading && !spendingData && !activityData) {
    return <LoadingSpinner message="Loading analytics data..." />;
  }

  return (
    <div className="container mx-auto space-y-8 px-4 py-12">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
        Your Data Insights
      </h2>

      {/* --- Spending Overview Section (Keep existing) --- */}
      <Card>
        <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          Spending Overview
        </h3>
        {/* Date Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-4">
          <Datepicker
            icon={HiCalendar}
            value={spendingStartDate ?? undefined}
            onChange={(date: Date | null) => setSpendingStartDate(date)}
            maxDate={spendingEndDate || undefined}
            placeholder="Start Date"
          />
          <Datepicker
            icon={HiCalendar}
            value={spendingEndDate ?? undefined}
            onChange={(date: Date | null) => setSpendingEndDate(date)}
            minDate={spendingStartDate || undefined}
            placeholder="End Date"
          />
          {(spendingStartDate || spendingEndDate) && (
            <Button size="sm" color="light" onClick={clearSpendingDates}>
              Clear Dates
            </Button>
          )}
        </div>

        {/* Chart */}
        {spendingError ? (
          <ErrorDisplay
            title="Spending Chart Error"
            error={spendingError}
            className="py-4"
          />
        ) : spendingLoading ? (
          <div className="flex h-[300px] items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : !lineChartData || lineChartData.length === 0 ? (
          <p className="py-4 text-gray-500 dark:text-gray-400">
            No spending data available
            {spendingStartDate || spendingEndDate ? " for this period" : " yet"}
            .
          </p>
        ) : (
          <div style={{ width: "100%", height: 350 }}>
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
      </Card>

      {/* --- Recent Activity Section --- */}
      <Card>
        <h3 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
          Recent Activity Log
        </h3>
        {/* Activity Filters (Keep existing) */}
        <div className="mb-6 grid grid-cols-1 items-end gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Datepicker
            icon={HiCalendar}
            value={activityStartDate ?? undefined}
            onChange={(date: Date | null) => {
              setActivityStartDate(date);
              setActivityPage(1);
            }}
            maxDate={activityEndDate || undefined}
            placeholder="Start Date"
          />
          <Datepicker
            icon={HiCalendar}
            value={activityEndDate ?? undefined}
            onChange={(date: Date | null) => {
              setActivityEndDate(date);
              setActivityPage(1);
            }}
            minDate={activityStartDate || undefined}
            placeholder="End Date"
          />
          <div>
            <Label htmlFor="dataType" className="mb-1 block text-sm">
              Data Type
            </Label>
            <Select
              id="dataType"
              value={activityDataType ?? ""} // Use ?? "" for Select value
              onChange={(e) => {
                // Cast value back to the correct type or handle empty string
                const value = e.target.value;
                setActivityDataType(
                  value === "purchase" || value === "search"
                    ? value
                    : undefined,
                );
                setActivityPage(1);
              }}
            >
              <option value="">All Types</option>
              <option value="purchase">Purchase</option>
              <option value="search">Search</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="searchTerm" className="mb-1 block text-sm">
              Search Details
            </Label>
            <TextInput
              id="searchTerm"
              icon={HiOutlineSearch}
              placeholder="Search items, queries..."
              value={activitySearchTerm}
              onChange={(e) => {
                setActivitySearchTerm(e.target.value);
                setActivityPage(1);
              }}
            />
          </div>
          <div className="flex justify-end lg:col-start-4">
            <Button size="sm" color="light" onClick={clearActivityFilters}>
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Activity Table */}
        {activityError || storesError ? ( // <-- Check both activityError and storesError
          <ErrorDisplay
            title="Activity Log Error"
            message={
              activityError?.message ||
              storesError?.message || // <-- Display storesError message if present
              "Could not load activity data or store details."
            }
            error={activityError || storesError} // Pass the first error encountered
            className="py-4"
          />
        ) : activityLoading && isPlaceholderData ? ( // Show spinner only if loading AND data is placeholder
          <div className="flex h-[200px] items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : !activityData || activityData.length === 0 ? (
          <p className="py-4 text-gray-500 dark:text-gray-400">
            No activity found matching your filters.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table hoverable>
                <TableHead>
                  <TableRow>
                    <TableHeadCell>Date</TableHeadCell>
                    <TableHeadCell>Type</TableHeadCell>
                    <TableHeadCell>Store</TableHeadCell>
                    <TableHeadCell>Details</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y">
                  {activityData.map((entry: RecentUserDataEntry) => {
                    // Safely access details[0]
                    const firstDetail =
                      Array.isArray(entry.details) && entry.details.length > 0
                        ? entry.details[0]
                        : undefined;

                    // Cast details based on dataType for better type safety (optional but recommended)
                    const purchaseDetail =
                      entry.dataType === "purchase"
                        ? (firstDetail as PurchaseEntry | undefined)
                        : undefined;
                    const searchDetail =
                      entry.dataType === "search"
                        ? (firstDetail as SearchEntry | undefined)
                        : undefined;

                    return (
                      <TableRow
                        key={entry._id}
                        className="bg-white dark:border-gray-700 dark:bg-gray-800"
                      >
                        <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                          {formatDate(entry.timestamp)}
                        </TableCell>
                        <TableCell className="capitalize">
                          {entry.dataType}
                        </TableCell>
                        <TableCell>
                          {/* Check storeId before using map */}
                          {entry.storeId
                            ? (storeNameMap.get(entry.storeId) ?? entry.storeId)
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {/* Display relevant details based on type */}
                          {entry.dataType === "purchase" &&
                            purchaseDetail?.items && // Use casted detail and optional chaining
                            purchaseDetail.items.length > 0 && (
                              <span>
                                {purchaseDetail.items
                                  .map((item: PurchaseItem) => item.name) // Add type to item
                                  .join(", ")}
                              </span>
                            )}
                          {entry.dataType === "search" &&
                            searchDetail?.query && ( // Use casted detail and optional chaining
                              <span>Query: "{searchDetail.query}"</span>
                            )}
                          {/* Add more detail rendering as needed */}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* --- Simple Previous/Next Pagination --- */}
            <div className="mt-4 flex items-center justify-between px-1">
              <Button
                size="sm"
                color="light"
                onClick={handlePreviousPage}
                disabled={activityPage <= 1 || activityLoading} // Disable if on first page or loading
              >
                <HiChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-gray-700 dark:text-gray-400">
                Page {activityPage}
              </span>
              <Button
                size="sm"
                color="light"
                onClick={handleNextPage}
                disabled={!hasMoreData || activityLoading} // Disable if no more data inferred or loading
              >
                {activityLoading && !isPlaceholderData ? (
                  <>
                    <Spinner size="xs" className="mr-2" /> Loading...
                  </>
                ) : (
                  <>
                    Next
                    <HiChevronRight className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
            {/* --- End Simple Pagination --- */}
          </>
        )}
      </Card>
    </div>
  );
};

export default UserAnalyticsPage;
