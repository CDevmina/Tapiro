import { useState, useMemo } from "react";
import {
  Card,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TableHeadCell,
  Spinner,
  Alert,
  Select,
  Datepicker,
  Pagination,
  Label,
  Badge,
} from "flowbite-react";
import { HiInformationCircle, HiFilter, HiCalendar } from "react-icons/hi";
import {
  useApiKeys, // Still needed for the filter dropdown
  useApiKeyUsage,
  useApiUsageLog,
} from "../../api/hooks/useStoreHooks";
import { GetApiUsageLogParams } from "../../api/types/data-contracts";
// Import Recharts components
import {
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";

// Helper function to format date (can be moved to a utils file later)
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

// Helper function to format date for API (YYYY-MM-DD)
const formatDateForApi = (
  date: Date | null | undefined,
): string | undefined => {
  if (!date) return undefined;
  return date.toISOString().split("T")[0];
};

// Colors for charts
const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#8884D8",
  "#82ca9d",
];

export function ApiUsageDashboard() {
  // --- State for API Usage Tab ---
  const [usageFilters, setUsageFilters] = useState<GetApiUsageLogParams>({
    keyId: undefined,
    startDate: undefined,
    endDate: undefined,
    page: 1,
    limit: 10,
  });

  // --- Data Fetching ---
  // Fetch API keys for the filter dropdown
  const { data: apiKeysData, isLoading: keysLoading } = useApiKeys();

  // Fetch usage stats
  const {
    data: usageStats,
    isLoading: usageStatsLoading,
    error: usageStatsError,
  } = useApiKeyUsage(usageFilters.keyId, {
    // Pass usageFilters.keyId directly (can be undefined)
    startDate: usageFilters.startDate,
    endDate: usageFilters.endDate,
  });

  // Fetch detailed logs
  const {
    data: usageLogData,
    isLoading: usageLogLoading,
    error: usageLogError,
    isPlaceholderData: isLogPlaceholder,
  } = useApiUsageLog(usageFilters);

  // --- Memos ---
  const apiKeyOptions = useMemo(() => {
    const options = [{ value: "", label: "All Keys" }];
    if (apiKeysData) {
      apiKeysData.forEach((key) => {
        options.push({
          value: key.keyId || "",
          label: `${key.name} (${key.prefix}...${key.status === "revoked" ? " [Revoked]" : ""})`,
        });
      });
    }
    return options;
  }, [apiKeysData]);

  // --- Handlers ---
  const handleFilterChange = (
    field: keyof GetApiUsageLogParams,
    value: string | number | Date | null | undefined,
  ) => {
    let apiValue: string | number | undefined;

    if (field === "startDate" || field === "endDate") {
      apiValue = formatDateForApi(value as Date | null);
    } else if (field === "keyId" && value === "") {
      apiValue = undefined;
    } else {
      apiValue = value as string | number | undefined;
    }

    setUsageFilters((prev) => ({
      ...prev,
      [field]: apiValue,
      page: field !== "page" ? 1 : (apiValue as number),
    }));
  };

  const onPageChange = (page: number) => {
    handleFilterChange("page", page);
  };

  return (
    <div className="space-y-6 pt-4">
      {/* Filter Controls */}
      <Card>
        <h4 className="mb-4 flex items-center text-lg font-medium text-gray-900 dark:text-white">
          <HiFilter className="mr-2 h-5 w-5" /> Filters
        </h4>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="apiKeyFilter">Filter by API Key</Label>
            <Select
              id="apiKeyFilter"
              value={usageFilters.keyId || ""}
              onChange={(e) => handleFilterChange("keyId", e.target.value)}
              disabled={keysLoading}
            >
              {apiKeyOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="startDateFilter">Start Date</Label>
            <Datepicker
              id="startDateFilter"
              icon={HiCalendar}
              value={
                usageFilters.startDate
                  ? new Date(usageFilters.startDate)
                  : undefined
              }
              onChange={(date: Date | null) =>
                handleFilterChange("startDate", date)
              }
              maxDate={
                usageFilters.endDate
                  ? new Date(usageFilters.endDate)
                  : undefined
              }
            />
          </div>
          <div>
            <Label htmlFor="endDateFilter">End Date</Label>
            <Datepicker
              id="endDateFilter"
              icon={HiCalendar}
              // Convert string back to Date for the component's value prop
              value={
                usageFilters.endDate
                  ? new Date(usageFilters.endDate)
                  : undefined
              }
              onChange={(date: Date | null) =>
                handleFilterChange("endDate", date)
              }
              minDate={
                usageFilters.startDate
                  ? new Date(usageFilters.startDate)
                  : undefined
              }
            />
          </div>
        </div>
      </Card>

      {/* Usage Statistics Section */}
      <Card>
        <h4 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
          Usage Statistics
        </h4>
        {/* Show loading spinner ONLY if the query is actually running */}
        {usageStatsLoading ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : usageStatsError ? ( // Show error if the query failed
          <Alert color="failure" icon={HiInformationCircle}>
            Failed to load usage statistics: {usageStatsError.message}
          </Alert>
        ) : // Add a specific check for when no key is selected (stats are undefined but not loading/error)
        !usageFilters.keyId ? (
          <p className="py-4 text-center text-gray-500 dark:text-gray-400">
            Select an API key from the filter above to view its usage
            statistics.
          </p>
        ) : // Original check for no data *after* a key was selected and the query ran
        !usageStats || usageStats.totalRequests === 0 ? (
          <p className="py-4 text-center text-gray-500 dark:text-gray-400">
            No usage data found for the selected key and date range.
          </p>
        ) : (
          // Render the stats and charts only when data is available
          <div className="space-y-6">
            <p className="text-gray-700 dark:text-gray-400">
              Total Requests:{" "}
              <span className="font-semibold text-gray-900 dark:text-white">
                {usageStats.totalRequests}
              </span>
            </p>
            {/* Charts */}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              {/* Daily Usage Chart */}
              {usageStats.dailyUsage && usageStats.dailyUsage.length > 0 && (
                <div>
                  <h5 className="text-md mb-2 font-medium text-gray-900 dark:text-white">
                    Requests per Day
                  </h5>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={usageStats.dailyUsage}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis allowDecimals={false} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#8884d8"
                        activeDot={{ r: 8 }}
                        name="Requests"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
              {/* Method Breakdown Chart */}
              {usageStats.methodBreakdown &&
                Object.keys(usageStats.methodBreakdown).length > 0 && (
                  <div>
                    <h5 className="text-md mb-2 font-medium text-gray-900 dark:text-white">
                      Requests by Method
                    </h5>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={Object.entries(usageStats.methodBreakdown).map(
                            ([name, value]) => ({ name, value }),
                          )}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, percent }) =>
                            `${name} ${(percent * 100).toFixed(0)}%`
                          }
                        >
                          {Object.entries(usageStats.methodBreakdown).map(
                            (_, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={COLORS[index % COLORS.length]}
                              />
                            ),
                          )}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </div>
          </div>
        )}
      </Card>

      {/* Detailed Log Section (Should be okay as is) */}
      <Card>
        <h4 className="mb-4 text-lg font-medium text-gray-900 dark:text-white">
          Detailed Request Log
        </h4>
        {usageLogLoading && !isLogPlaceholder ? (
          <div className="flex justify-center py-8">
            <Spinner size="lg" />
          </div>
        ) : usageLogError ? (
          <Alert color="failure" icon={HiInformationCircle}>
            Failed to load detailed logs: {usageLogError.message}
          </Alert>
        ) : !usageLogData?.logs || usageLogData.logs.length === 0 ? (
          <p className="py-4 text-center text-gray-500 dark:text-gray-400">
            No detailed logs found for the selected filters.
          </p>
        ) : (
          <>
            <div
              className={`overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 ${isLogPlaceholder ? "opacity-50" : ""}`}
            >
              <Table hoverable>
                <TableHead>
                  <TableRow>
                    <TableHeadCell>Timestamp</TableHeadCell>
                    <TableHeadCell>Method</TableHeadCell>
                    <TableHeadCell>Endpoint</TableHeadCell>
                    <TableHeadCell>Key Prefix</TableHeadCell>
                    <TableHeadCell>User Agent</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y">
                  {usageLogData.logs.map((log) => (
                    <TableRow
                      key={log._id}
                      className="bg-white dark:border-gray-700 dark:bg-gray-800"
                    >
                      <TableCell>{formatDate(log.timestamp)}</TableCell>
                      <TableCell>
                        <Badge color="gray">{log.method}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.endpoint}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.apiKeyPrefix}...
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-xs text-gray-600 dark:text-gray-400">
                        {log.userAgent}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {/* Pagination Controls */}
            {usageLogData.pagination &&
              usageLogData.pagination.totalPages &&
              usageLogData.pagination.totalPages > 1 && (
                <div className="flex justify-center pt-4">
                  <Pagination
                    currentPage={usageLogData.pagination.currentPage || 1}
                    totalPages={usageLogData.pagination.totalPages || 1}
                    onPageChange={onPageChange}
                    showIcons
                  />
                </div>
              )}
          </>
        )}
      </Card>
    </div>
  );
}
