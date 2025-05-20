import React, { useState, useMemo, useEffect } from "react"; // Added useEffect
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
  Dropdown, // Added Dropdown
  Modal, // Added Modal
  ModalHeader,
  ModalBody,
  ModalFooter, // Added ModalFooter
  Toast,
  ToastToggle,
  DropdownItem,
  DropdownDivider, // Added Toast
  List, // Added List for modal details
  ListItem, // Added ListItem for modal details
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
  HiTrash, // Added Trash icon
  HiExclamation, // Added Exclamation icon for modal
  HiCheckCircle, // For success toast
  HiXCircle, // For error toast
  HiOutlineEye, // Added Eye icon for view details
} from "react-icons/hi";
import {
  useRecentUserData,
  useSpendingAnalytics,
  useDeleteUserDataHistory,
} from "../../api/hooks/useUserHooks";
import { useLookupStores } from "../../api/hooks/useStoreHooks";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorDisplay from "../../components/common/ErrorDisplay";
import {
  RecentUserDataEntry,
  StoreBasicInfo,
  MonthlySpendingItem,
  GetRecentUserDataParams,
  PurchaseItem,
  PurchaseEntry,
  SearchEntry,
  UserDataHistoryDeletionRequest,
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

const formatCurrency = (value: number | undefined | null) => {
  if (value === undefined || value === null) return "N/A";
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

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletionScope, setDeletionScope] = useState<
    UserDataHistoryDeletionRequest["scope"] | null
  >(null);
  const [entryToDeleteId, setEntryToDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  // --- State for Details Modal ---
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedEntryForDetails, setSelectedEntryForDetails] =
    useState<RecentUserDataEntry | null>(null);

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
    isPlaceholderData,
    refetch: refetchActivityData, // Destructure refetch function
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

  const { mutate: deleteUserData, isPending: isDeletingUserData } =
    useDeleteUserDataHistory();

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

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleDeleteRequest = (
    scope: UserDataHistoryDeletionRequest["scope"],
    entryId?: string,
  ) => {
    setDeletionScope(scope);
    if (entryId) {
      setEntryToDeleteId(entryId);
    } else {
      setEntryToDeleteId(null);
    }
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    if (!deletionScope) return;

    const requestBody: UserDataHistoryDeletionRequest = {
      scope: deletionScope,
    };
    if (deletionScope === "individual" && entryToDeleteId) {
      requestBody.entryIds = [entryToDeleteId];
    } else if (deletionScope === "individual" && !entryToDeleteId) {
      setToast({
        message: "Error: Entry ID missing for individual deletion.",
        type: "error",
      });
      setShowDeleteModal(false);
      return;
    }

    deleteUserData(requestBody, {
      onSuccess: () => {
        setToast({
          message: "Data history deleted successfully.",
          type: "success",
        });
        setShowDeleteModal(false);
        setDeletionScope(null);
        setEntryToDeleteId(null);
        refetchActivityData(); // Explicitly refetch the activity data
      },
      onError: (error) => {
        setToast({
          message: error.message || "Failed to delete data history.",
          type: "error",
        });
        setShowDeleteModal(false);
      },
    });
  };

  // --- Handler for View Details ---
  const handleViewDetails = (entry: RecentUserDataEntry) => {
    setSelectedEntryForDetails(entry);
    setShowDetailsModal(true);
  };

  // --- Render Logic ---
  const isLoading = spendingLoading || activityLoading || storesLoading;

  if (isLoading && !spendingData && !activityData) {
    return <LoadingSpinner message="Loading analytics data..." />;
  }

  return (
    <div className="container mx-auto space-y-8 px-4 py-12">
      {toast && (
        <Toast className="fixed top-5 right-5 z-50">
          {toast.type === "success" ? (
            <HiCheckCircle className="h-5 w-5 text-green-600 dark:text-green-500" />
          ) : (
            <HiXCircle className="h-5 w-5 text-red-600 dark:text-red-500" />
          )}
          <div className="pl-4 text-sm font-normal">{toast.message}</div>
          <ToastToggle onDismiss={() => setToast(null)} />
        </Toast>
      )}

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
            <Button size="sm" color="blue" outline onClick={clearSpendingDates}>
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
                <YAxis
                  tickFormatter={(value) => formatCurrency(value as number)}
                />
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
        <div className="mb-4 flex flex-col items-start justify-between sm:flex-row sm:items-center">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Recent Activity Log
          </h3>
          <Dropdown
            label="Delete History"
            color="red"
            size="sm"
            disabled={isDeletingUserData}
          >
            <DropdownItem
              onClick={() => handleDeleteRequest("today")}
              icon={HiTrash}
            >
              Delete Today's Activity
            </DropdownItem>
            <DropdownItem
              onClick={() => handleDeleteRequest("last7days")}
              icon={HiTrash}
            >
              Delete Last 7 Days
            </DropdownItem>
            <DropdownDivider />
            <DropdownItem
              onClick={() => handleDeleteRequest("all")}
              icon={HiTrash}
              className="text-red-700 hover:bg-red-50 dark:text-red-500 dark:hover:bg-red-600"
            >
              Delete All Activity
            </DropdownItem>
          </Dropdown>
        </div>

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
            <Button
              size="sm"
              color="blue"
              outline
              onClick={clearActivityFilters}
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Activity Table */}
        {activityError || storesError ? (
          <ErrorDisplay
            title="Activity Log Error"
            message={
              activityError?.message ||
              storesError?.message ||
              "Could not load activity data or store details."
            }
            error={activityError || storesError}
            className="py-4"
          />
        ) : activityLoading && isPlaceholderData ? (
          <div className="flex h-[200px] items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : !activityData || activityData.length === 0 ? (
          <p className="py-4 text-gray-500 dark:text-gray-400">
            No activity found matching your filters.
          </p>
        ) : (
          <>
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <Table hoverable>
                <TableHead>
                  <TableRow>
                    <TableHeadCell>Date</TableHeadCell>
                    <TableHeadCell>Type</TableHeadCell>
                    <TableHeadCell>Store</TableHeadCell>
                    <TableHeadCell>Summary</TableHeadCell>
                    <TableHeadCell>Actions</TableHeadCell>
                  </TableRow>
                </TableHead>
                <TableBody className="divide-y">
                  {activityData.map((entry: RecentUserDataEntry) => {
                    const firstDetail =
                      Array.isArray(entry.details) && entry.details.length > 0
                        ? entry.details[0]
                        : undefined;
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
                          {entry.storeId
                            ? (storeNameMap.get(entry.storeId) ?? entry.storeId)
                            : "N/A"}
                        </TableCell>
                        <TableCell className="text-xs">
                          {entry.dataType === "purchase" &&
                            purchaseDetail?.items &&
                            purchaseDetail.items.length > 0 && (
                              <span>
                                {purchaseDetail.items
                                  .slice(0, 2) // Show first 2 items as summary
                                  .map((item: PurchaseItem) => item.name)
                                  .join(", ")}
                                {purchaseDetail.items.length > 2 && "..."}
                              </span>
                            )}
                          {entry.dataType === "search" &&
                            searchDetail?.query && (
                              <span>Query: "{searchDetail.query}"</span>
                            )}
                        </TableCell>
                        <TableCell className="flex space-x-2">
                          <Button
                            color="blue"
                            size="xs"
                            outline
                            onClick={() => handleViewDetails(entry)}
                            title="View details"
                          >
                            <HiOutlineEye className="h-4 w-4" />
                          </Button>
                          <Button
                            color="red"
                            size="xs"
                            outline
                            onClick={() =>
                              handleDeleteRequest("individual", entry._id)
                            }
                            disabled={isDeletingUserData}
                            title="Delete this entry"
                          >
                            <HiTrash className="h-4 w-4" />
                          </Button>
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
                color="blue"
                outline
                onClick={handlePreviousPage}
                disabled={activityPage <= 1 || activityLoading} // Disable if on first page or loading
              >
                <HiChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <span className="inline-flex items-center rounded-md bg-blue-100 px-3 py-1.5 text-sm font-semibold text-blue-700 dark:bg-blue-700 dark:text-blue-100">
                Page {activityPage}
              </span>
              <Button
                size="sm"
                color="blue"
                outline
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

      {/* Deletion Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        size="md"
        onClose={() => !isDeletingUserData && setShowDeleteModal(false)}
        popup
      >
        <ModalHeader />
        <ModalBody>
          <div className="text-center">
            <HiExclamation className="mx-auto mb-4 h-14 w-14 text-red-600 dark:text-red-600" />
            <h3 className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
              Are you sure you want to delete this data?
              {deletionScope === "today" &&
                " This will remove all activity recorded today."}
              {deletionScope === "last7days" &&
                " This will remove all activity from the last 7 days."}
              {deletionScope === "all" &&
                " This will remove ALL your activity history."}
              {deletionScope === "individual" &&
                entryToDeleteId &&
                " This specific entry will be permanently removed."}
              This action cannot be undone.
            </h3>
            <div className="flex justify-center gap-4">
              <Button
                color="red"
                onClick={confirmDelete}
                disabled={isDeletingUserData}
              >
                {isDeletingUserData ? (
                  <Spinner size="sm" className="mr-2" />
                ) : null}
                Yes, I'm sure
              </Button>
              <Button
                color="blue"
                outline
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeletingUserData}
              >
                No, cancel
              </Button>
            </div>
          </div>
        </ModalBody>
      </Modal>

      {/* Activity Details Modal */}
      {selectedEntryForDetails && (
        <Modal
          show={showDetailsModal}
          onClose={() => setShowDetailsModal(false)}
          size="xl" // Increased modal size
        >
          <ModalHeader>Activity Entry Details</ModalHeader>
          <ModalBody className="space-y-6">
            <Card className="bg-slate-50 p-4 dark:bg-slate-800">
              <h4 className="mb-3 text-lg font-semibold text-gray-900 dark:text-white">
                Entry Overview
              </h4>
              <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label
                    htmlFor="submissionTimestamp"
                    className="text-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    Submission Timestamp
                  </Label>
                  <p
                    id="submissionTimestamp"
                    className="text-sm font-semibold text-gray-900 dark:text-white"
                  >
                    {formatDate(selectedEntryForDetails.timestamp)}
                  </p>
                </div>
                <div>
                  <Label
                    htmlFor="dataType"
                    className="text-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    Data Type
                  </Label>
                  <p
                    id="dataType"
                    className="text-sm font-semibold text-gray-900 capitalize dark:text-white"
                  >
                    {selectedEntryForDetails.dataType}
                  </p>
                </div>
                <div>
                  <Label
                    htmlFor="storeName"
                    className="text-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    Store
                  </Label>
                  <p
                    id="storeName"
                    className="text-sm font-semibold text-gray-900 dark:text-white"
                  >
                    {selectedEntryForDetails.storeId
                      ? (storeNameMap.get(selectedEntryForDetails.storeId) ??
                        `ID: ${selectedEntryForDetails.storeId}`)
                      : "N/A"}
                  </p>
                </div>
              </div>
            </Card>

            {selectedEntryForDetails.details &&
              selectedEntryForDetails.details.length > 0 && (
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Detailed Entries ({selectedEntryForDetails.details.length})
                </h4>
              )}

            {selectedEntryForDetails.details?.map((detail, index) => (
              <Card key={index} className="shadow-md">
                <div className="mb-2 flex items-center justify-between border-b pb-2 dark:border-gray-700">
                  <h5 className="text-md font-semibold text-gray-800 dark:text-gray-100">
                    Detail #{index + 1}
                  </h5>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(detail.timestamp)}
                  </span>
                </div>

                {selectedEntryForDetails.dataType === "purchase" &&
                  (detail as PurchaseEntry).items && (
                    <div>
                      <Label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Purchased Items:
                      </Label>
                      <List unstyled className="space-y-3">
                        {(detail as PurchaseEntry).items.map(
                          (item: PurchaseItem, itemIndex: number) => (
                            <ListItem
                              key={itemIndex}
                              className="rounded-lg border bg-gray-50 p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                            >
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                                <span className="text-md font-semibold text-blue-600 dark:text-blue-500">
                                  {item.name}
                                </span>
                                {item.price !== undefined &&
                                  item.price !== null && (
                                    <span className="text-sm font-medium text-green-600 dark:text-green-400">
                                      {formatCurrency(item.price)}
                                    </span>
                                  )}
                              </div>
                              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
                                {item.quantity && (
                                  <span>
                                    Qty:{" "}
                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                      {item.quantity}
                                    </span>
                                  </span>
                                )}
                                {item.category && (
                                  <span>
                                    Category:{" "}
                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                      {item.category}
                                    </span>
                                  </span>
                                )}
                                {item.sku && (
                                  <span>
                                    SKU:{" "}
                                    <span className="font-medium text-gray-700 dark:text-gray-300">
                                      {item.sku}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </ListItem>
                          ),
                        )}
                      </List>
                    </div>
                  )}
                {selectedEntryForDetails.dataType === "search" &&
                  (detail as SearchEntry).query && (
                    <div className="space-y-2">
                      <div>
                        <Label
                          htmlFor={`searchQuery-${index}`}
                          className="text-xs font-medium text-gray-500 dark:text-gray-400"
                        >
                          Search Query
                        </Label>
                        <p
                          id={`searchQuery-${index}`}
                          className="text-md rounded-md bg-gray-100 p-2 font-semibold text-gray-800 dark:bg-gray-700 dark:text-gray-100"
                        >
                          {(detail as SearchEntry).query}
                        </p>
                      </div>
                      {(detail as SearchEntry).results !== undefined && (
                        <div>
                          <Label
                            htmlFor={`searchResults-${index}`}
                            className="text-xs font-medium text-gray-500 dark:text-gray-400"
                          >
                            Number of Results
                          </Label>
                          <p
                            id={`searchResults-${index}`}
                            className="text-sm text-gray-700 dark:text-gray-300"
                          >
                            {(detail as SearchEntry).results}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
              </Card>
            ))}
            {!selectedEntryForDetails.details ||
              (selectedEntryForDetails.details.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No detailed entries recorded for this submission.
                </p>
              ))}
          </ModalBody>
          <ModalFooter>
            <Button color="blue" onClick={() => setShowDetailsModal(false)}>
              Close
            </Button>
          </ModalFooter>
        </Modal>
      )}
    </div>
  );
};

export default UserAnalyticsPage;
