import { useState, useEffect, useMemo } from "react"; // Removed ReactElement
import {
  Button,
  Card,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
} from "flowbite-react";
import {
  HiChevronDown,
  HiChevronUp,
  HiOutlineDesktopComputer,
  HiOutlineShoppingBag,
  HiOutlineHome,
  HiOutlineSparkles,
  HiOutlineBookOpen,
  HiOutlineHeart,
  HiOutlinePuzzle,
  HiOutlineBriefcase,
  HiOutlineKey,
  HiOutlineGlobeAlt,
  HiOutlineShoppingCart,
  HiOutlineGift,
  HiOutlineCode,
  HiQuestionMarkCircle,
} from "react-icons/hi";
import { useTaxonomy } from "../../api/hooks/useTaxonomyHooks";
import { useUpdateUserPreferences } from "../../api/hooks/useUserHooks";
import {
  PreferenceItem,
  // Removed TaxonomyCategory
} from "../../api/types/data-contracts";
import ErrorDisplay from "../common/ErrorDisplay"; // Assuming ErrorDisplay exists

// --- Icon Mapping (Keep as is) ---
const categoryIcons: { [key: string]: React.ElementType } = {
  Electronics: HiOutlineDesktopComputer,
  Fashion: HiOutlineShoppingBag,
  Home: HiOutlineHome,
  Beauty: HiOutlineSparkles,
  Media: HiOutlineBookOpen,
  "Health & Wellness": HiOutlineHeart,
  "Toys & Games": HiOutlinePuzzle,
  "Office Supplies": HiOutlineBriefcase,
  Gaming: HiOutlineKey,
  Travel: HiOutlineGlobeAlt,
  Grocery: HiOutlineShoppingCart,
  "Jewelry & Watches": HiOutlineGift,
  Gifts: HiOutlineGift,
  Software: HiOutlineCode,
};
const DefaultIcon = HiQuestionMarkCircle;
// --- End Icon Mapping ---

interface InterestFormModalProps {
  show: boolean;
  onClose: () => void;
}

// --- State for selected attribute values ---
interface SelectedAttributeValue {
  categoryId: string;
  attributeName: string;
  value: string;
}

export function InterestFormModal({ show, onClose }: InterestFormModalProps) {
  const {
    data: taxonomyData,
    isLoading: isLoadingTaxonomy,
    error: taxonomyError,
  } = useTaxonomy();
  const updateUserPreferences = useUpdateUserPreferences();

  // --- Updated State ---
  const [selectedAttributeValues, setSelectedAttributeValues] = useState<
    SelectedAttributeValue[]
  >([]);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);
  // --- End Updated State ---

  // --- Top Level Categories (Keep as is) ---
  const topLevelCategories = useMemo(() => {
    return (
      taxonomyData?.categories
        .filter((cat) => !cat.parent_id)
        .sort((a, b) => a.name.localeCompare(b.name)) || []
    );
  }, [taxonomyData]);

  // --- Category Map Removed (was unused) ---

  // --- Handlers ---
  const handleExpandCategory = (categoryId: string) => {
    setExpandedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  };

  // --- New Handler for Attribute Value Selection ---
  const handleSelectAttributeValue = (
    categoryId: string,
    attributeName: string,
    value: string,
  ) => {
    setSelectedAttributeValues((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.categoryId === categoryId &&
          item.attributeName === attributeName &&
          item.value === value,
      );
      if (existingIndex > -1) {
        // Remove if already selected
        return prev.filter((_, index) => index !== existingIndex);
      } else {
        // Add if not selected
        return [...prev, { categoryId, attributeName, value }];
      }
    });
  };
  // --- End New Handler ---

  // --- Updated handleSubmit ---
  const handleSubmit = async () => {
    const groupedPreferences = new Map<string, PreferenceItem>();

    selectedAttributeValues.forEach(({ categoryId, attributeName, value }) => {
      // Initialize preference for the category if not present
      if (!groupedPreferences.has(categoryId)) {
        groupedPreferences.set(categoryId, {
          category: categoryId,
          score: 1.0, // Assign a base score for selecting the category
          attributes: {}, // Initialize attributes object
        });
      }

      const pref = groupedPreferences.get(categoryId)!;

      // Ensure attributes object exists (it should from the initialization above)
      if (!pref.attributes) {
        pref.attributes = {};
      }

      // --- Type Assertion for Dynamic Attribute Access ---
      // Cast attributes to allow indexing by any string key
      const attributesMap = pref.attributes as Record<
        string,
        Record<string, number>
      >;
      // --- End Type Assertion ---

      // Ensure the specific attribute object (value map) exists
      let attributeValueMap = attributesMap[attributeName]; // Use the casted map
      if (!attributeValueMap) {
        attributeValueMap = {};
        attributesMap[attributeName] = attributeValueMap; // Use the casted map
      }

      // Assign score to the specific attribute value
      attributeValueMap[value] = 1.0; // Assign score to the inner map
    });

    const preferencesPayload: PreferenceItem[] = Array.from(
      groupedPreferences.values(),
    );

    if (preferencesPayload.length === 0) {
      console.warn("No preferences selected.");
      // Optionally show a message to the user or simply close
      onClose(); // Close if nothing selected, or handle differently
      return;
    }

    try {
      await updateUserPreferences.mutateAsync({
        preferences: preferencesPayload,
      });
      onClose(); // Close modal on success
    } catch (err) {
      console.error("Failed to save preferences:", err);
      // Optionally display an error message to the user
    }
  };
  // --- End Updated handleSubmit ---

  // --- useEffect for Error Handling (Keep as is) ---
  useEffect(() => {
    if (taxonomyError) {
      console.error("Taxonomy failed to load, closing interest modal.");
      onClose();
    }
  }, [taxonomyError, onClose]);

  // --- Check if a specific attribute value is selected ---
  const isAttributeValueSelected = (
    categoryId: string,
    attributeName: string,
    value: string,
  ): boolean => {
    return selectedAttributeValues.some(
      (item) =>
        item.categoryId === categoryId &&
        item.attributeName === attributeName &&
        item.value === value,
    );
  };
  // --- End Check ---

  return (
    <Modal show={show} size="4xl" popup onClose={onClose}>
      <div className="p-4">
        <ModalHeader>Tell us what you're interested in</ModalHeader>
      </div>
      <ModalBody>
        {isLoadingTaxonomy && (
          <div className="flex h-64 items-center justify-center">
            <Spinner size="xl" />
          </div>
        )}
        {taxonomyError && (
          <ErrorDisplay
            title="Could not load interests"
            message={taxonomyError.message}
          />
        )}
        {!isLoadingTaxonomy &&
          !taxonomyError &&
          taxonomyData &&
          taxonomyData.categories && (
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-400">
                Select topics to personalize your experience. Click a main topic
                to refine your interests by selecting specific features. Choose
                at least one feature.
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {/* --- Render Top Level Categories --- */}
                {topLevelCategories.map((category) => {
                  const isExpanded = expandedCategoryIds.includes(category.id);
                  // Get attributes directly from the category object
                  const attributes = category.attributes || [];
                  const hasAttributes = attributes.length > 0;
                  const IconComponent =
                    categoryIcons[category.name] || DefaultIcon;

                  return (
                    <div key={category.id} className="flex flex-col">
                      <Card
                        onClick={
                          hasAttributes
                            ? () => handleExpandCategory(category.id)
                            : undefined // No action if no attributes
                        }
                        className={`h-full transition-all duration-150 ${hasAttributes ? "cursor-pointer" : "cursor-default"} ${isExpanded ? "ring-2 ring-blue-500 dark:ring-blue-400" : hasAttributes ? "hover:bg-gray-50 dark:hover:bg-gray-600" : ""}`}
                      >
                        {/* Card Content (Icon, Title, Description) - Keep as is */}
                        <div className="flex h-full flex-col items-center justify-between p-3 text-center">
                          <div className="flex flex-col items-center">
                            <IconComponent className="mb-2 h-8 w-8 text-blue-600 dark:text-blue-500" />
                            <h5 className="text-md font-semibold text-gray-900 dark:text-white">
                              {category.name}
                            </h5>
                            {category.description && (
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {category.description}
                              </p>
                            )}
                          </div>
                          {/* Chevron or Placeholder */}
                          {hasAttributes && (
                            <div className="mt-2">
                              {isExpanded ? (
                                <HiChevronUp className="h-5 w-5 text-gray-500" />
                              ) : (
                                <HiChevronDown className="h-5 w-5 text-gray-500" />
                              )}
                            </div>
                          )}
                          {!hasAttributes && (
                            <div className="mt-2 h-5 w-5"></div> // Placeholder
                          )}
                        </div>
                      </Card>

                      {/* --- Render Attributes and Values when Expanded --- */}
                      {isExpanded && hasAttributes && (
                        <div className="mt-2 space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800">
                          {attributes.map((attribute) => (
                            <div key={attribute.name}>
                              <h6 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                                {attribute.description || attribute.name}{" "}
                                {/* Use description or name */}
                              </h6>
                              <div className="flex flex-wrap gap-2">
                                {(attribute.values || []).map((value) => {
                                  const isSelected = isAttributeValueSelected(
                                    category.id,
                                    attribute.name,
                                    value,
                                  );
                                  return (
                                    <Button
                                      key={value}
                                      size="xs"
                                      color={isSelected ? "blue" : "light"}
                                      onClick={() =>
                                        handleSelectAttributeValue(
                                          category.id,
                                          attribute.name,
                                          value,
                                        )
                                      }
                                      className="transition-colors duration-150"
                                    >
                                      {value}
                                    </Button>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* --- End Attribute Rendering --- */}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
      </ModalBody>
      <ModalFooter>
        <Button
          onClick={handleSubmit}
          disabled={
            isLoadingTaxonomy ||
            selectedAttributeValues.length === 0 || // Disable if nothing selected
            updateUserPreferences.isPending
          }
        >
          {updateUserPreferences.isPending ? (
            <>
              <Spinner size="sm" />
              <span className="pl-3">Saving...</span>
            </>
          ) : (
            "Done"
          )}
        </Button>
        <Button
          color="alternative"
          onClick={onClose}
          disabled={updateUserPreferences.isPending}
        >
          Skip for now
        </Button>
      </ModalFooter>
    </Modal>
  );
}
