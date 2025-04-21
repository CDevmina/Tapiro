import { useState, useEffect } from "react";
import {
  useUserPreferences,
  useUpdateUserPreferences,
} from "../api/hooks/useUserHooks";
import { useTaxonomy } from "../api/hooks/useSystemHooks";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorDisplay from "../components/common/ErrorDisplay";
import {
  Card,
  RangeSlider,
  Button,
  Toast,
  Spinner,
  ToastToggle,
  Table, // Import Table components
  TableHead,
  TableHeadCell,
  TableBody,
  TableRow,
  TableCell,
} from "flowbite-react";
import { HiCheck, HiExclamation } from "react-icons/hi";
import { PreferenceItem } from "../api/types/data-contracts";

export default function UserPreferencesPage() {
  const {
    data: preferencesData,
    isLoading: preferencesLoading,
    error: preferencesError,
    refetch, // Add refetch
  } = useUserPreferences();
  const {
    data: taxonomyData,
    isLoading: taxonomyLoading,
    error: taxonomyError,
  } = useTaxonomy();
  const updateUserPreferences = useUpdateUserPreferences();

  const [editablePreferences, setEditablePreferences] = useState<
    PreferenceItem[]
  >([]);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);

  useEffect(() => {
    // Sort preferences alphabetically by category name using the map
    if (preferencesData?.preferences && taxonomyData?.categories) {
      const map = taxonomyData.categories.reduce(
        (acc, cat) => {
          acc[cat.id] = cat.name;
          return acc;
        },
        {} as Record<string, string>,
      );
      const sortedPrefs = [...preferencesData.preferences].sort((a, b) => {
        const nameA = map[a.category] || a.category;
        const nameB = map[b.category] || b.category;
        return nameA.localeCompare(nameB);
      });
      setEditablePreferences(sortedPrefs);
    } else if (preferencesData?.preferences) {
      // Fallback sort by ID if taxonomy isn't ready
      const sortedById = [...preferencesData.preferences].sort((a, b) =>
        a.category.localeCompare(b.category),
      );
      setEditablePreferences(sortedById);
    }
  }, [preferencesData, taxonomyData]); // Depend on both

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

  // Handle slider changes
  const handleScoreChange = (category: string, newScore: number) => {
    setEditablePreferences((prev) =>
      prev.map((pref) =>
        pref.category === category
          ? { ...pref, score: newScore / 100 } // Ensure score is between 0 and 1
          : pref,
      ),
    );
  };

  const handleSaveChanges = async () => {
    setShowSuccessToast(false);
    setShowErrorToast(false);
    try {
      await updateUserPreferences.mutateAsync(
        {
          preferences: editablePreferences,
        },
        {
          onSuccess: () => {
            setShowSuccessToast(true);
            refetch(); // Refetch preferences after successful save
          },
          onError: () => {
            setShowErrorToast(true);
          },
        },
      );
    } catch (err) {
      // This catch might not be needed if using onSuccess/onError callbacks
      console.error("Failed to update preferences:", err);
      setShowErrorToast(true);
    }
  };

  const isLoading = preferencesLoading || taxonomyLoading;
  const error = preferencesError || taxonomyError;

  if (isLoading) {
    return <LoadingSpinner message="Loading preferences..." />;
  }

  if (error) {
    return (
      <ErrorDisplay
        title="Failed to load preferences"
        message="Could not retrieve your preference information."
        error={error}
      />
    );
  }

  return (
    <div className="container mx-auto space-y-6 px-4 py-12">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">
            Manage Your Preferences
          </h2>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Adjust the scores below to reflect your interests (0% = Not
            Interested, 100% = Very Interested).
          </p>
        </div>
        {/* Save Button - Moved to top right */}
        <Button
          onClick={handleSaveChanges}
          disabled={updateUserPreferences.isPending}
          color="cyan"
          size="sm" // Smaller button
        >
          {updateUserPreferences.isPending ? (
            <>
              <Spinner size="sm" />
              <span className="pl-2">Saving...</span>
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>

      {/* Success Toast */}
      {showSuccessToast && (
        <Toast className="fixed right-5 bottom-5 z-50">
          {" "}
          {/* Position toast */}
          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-500 dark:bg-green-800 dark:text-green-200">
            <HiCheck className="h-5 w-5" />
          </div>
          <div className="ml-3 text-sm font-normal">
            Preferences updated successfully.
          </div>
          <ToastToggle onDismiss={() => setShowSuccessToast(false)} />
        </Toast>
      )}

      {/* Error Toast */}
      {showErrorToast && (
        <Toast className="fixed right-5 bottom-5 z-50">
          {" "}
          {/* Position toast */}
          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-500 dark:bg-red-800 dark:text-red-200">
            <HiExclamation className="h-5 w-5" />
          </div>
          <div className="ml-3 text-sm font-normal">
            Failed to update preferences. Please try again.
          </div>
          <ToastToggle onDismiss={() => setShowErrorToast(false)} />
        </Toast>
      )}

      <Card>
        {editablePreferences.length > 0 ? (
          <div className="overflow-x-auto">
            {" "}
            {/* Make table responsive */}
            <Table hoverable>
              <TableHead>
                <TableHeadCell>Interest Category</TableHeadCell>
                <TableHeadCell className="min-w-[200px]">
                  Interest Level
                </TableHeadCell>{" "}
                {/* Min width for slider */}
                <TableHeadCell>Score</TableHeadCell>
              </TableHead>
              <TableBody className="divide-y">
                {editablePreferences.map((pref) => (
                  <TableRow
                    key={pref.category}
                    className="bg-white dark:border-gray-700 dark:bg-gray-800"
                  >
                    <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">
                      {taxonomyMap[pref.category] || pref.category}{" "}
                      {/* Display Name */}
                    </TableCell>
                    <TableCell>
                      <RangeSlider
                        id={`slider-${pref.category}`}
                        min={0}
                        max={100}
                        value={(pref.score * 100).toString()} // Value 0-100
                        onChange={(e) =>
                          handleScoreChange(
                            pref.category,
                            parseInt(e.target.value, 10),
                          )
                        }
                        disabled={updateUserPreferences.isPending}
                        className="w-full" // Ensure slider takes width
                      />
                    </TableCell>
                    <TableCell className="text-right font-medium text-cyan-700 dark:text-cyan-500">
                      {(pref.score * 100).toFixed(0)}% {/* Display Score */}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <p className="py-4 text-center text-sm text-gray-500 italic dark:text-gray-400">
            No preferences found. Your preferences will be generated as you
            interact or submit data.
          </p>
        )}
      </Card>
    </div>
  );
}
