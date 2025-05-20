import { useState, useEffect, useMemo } from "react";
import {
  Button,
  Card,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  Alert, // Added Alert for Step 2 guidance
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
  HiArrowRight, // For Next button
  HiArrowLeft, // For Back button
} from "react-icons/hi";
import { useTaxonomy } from "../../api/hooks/useTaxonomyHooks";
import { useUpdateUserPreferences } from "../../api/hooks/useUserHooks";
import { PreferenceItem } from "../../api/types/data-contracts";
import ErrorDisplay from "../common/ErrorDisplay";

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
  const {
    mutateAsync: performUpdateUserPreferences,
    isPending: isUpdatingUserPreferences,
    reset: resetUpdateUserPreferencesMutation,
  } = useUpdateUserPreferences();

  // --- New State for Steps ---
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [selectedCategoryIdsStep1, setSelectedCategoryIdsStep1] = useState<
    string[]
  >([]);
  // --- End New State ---

  const [selectedAttributeValues, setSelectedAttributeValues] = useState<
    SelectedAttributeValue[]
  >([]);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);

  // --- Top Level Categories (Keep as is) ---
  const topLevelCategories = useMemo(() => {
    return (
      taxonomyData?.categories
        .filter((cat) => !cat.parent_id)
        .sort((a, b) => a.name.localeCompare(b.name)) || []
    );
  }, [taxonomyData]);

  // --- Categories selected in Step 1, for display in Step 2 ---
  const categoriesForStep2 = useMemo(() => {
    if (!taxonomyData?.categories) return [];
    return taxonomyData.categories
      .filter((cat) => selectedCategoryIdsStep1.includes(cat.id))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [taxonomyData, selectedCategoryIdsStep1]);

  // --- Reset state when modal is shown/hidden ---
  useEffect(() => {
    if (show) {
      setCurrentStep(1);
      setSelectedCategoryIdsStep1([]);
      setSelectedAttributeValues([]);
      setExpandedCategoryIds([]);
    } else {
      // Reset mutation state if modal is closed
      resetUpdateUserPreferencesMutation();
    }
  }, [show, resetUpdateUserPreferencesMutation]);

  // --- Handlers ---
  const handleExpandCategory = (categoryId: string) => {
    setExpandedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  };

  const handleSelectCategoryStep1 = (categoryId: string) => {
    setSelectedCategoryIdsStep1((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  };

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
        return prev.filter((_, index) => index !== existingIndex);
      } else {
        return [...prev, { categoryId, attributeName, value }];
      }
    });
  };

  const handleSubmit = async () => {
    const groupedPreferences = new Map<string, PreferenceItem>();

    // 1. Initialize preferences for all categories selected in Step 1
    selectedCategoryIdsStep1.forEach((categoryId) => {
      groupedPreferences.set(categoryId, {
        category: categoryId,
        score: 1.0, // Default score
        attributes: {},
      });
    });

    // 2. Populate attributes from selectedAttributeValues (populated in Step 2)
    selectedAttributeValues.forEach(({ categoryId, attributeName, value }) => {
      if (groupedPreferences.has(categoryId)) {
        const pref = groupedPreferences.get(categoryId)!;
        if (!pref.attributes) {
          pref.attributes = {};
        }
        const attributesMap = pref.attributes as Record<
          string,
          Record<string, number>
        >;
        let attributeValueMap = attributesMap[attributeName];
        if (!attributeValueMap) {
          attributeValueMap = {};
          attributesMap[attributeName] = attributeValueMap;
        }
        attributeValueMap[value] = 1.0;
      }
    });

    const preferencesPayload: PreferenceItem[] = Array.from(
      groupedPreferences.values(),
    ).filter((pref) => selectedCategoryIdsStep1.includes(pref.category));

    if (preferencesPayload.length === 0 && currentStep === 1) {
      // If submitting from step 1 and nothing selected, just close.
      // Or, if "Save & Close" is clicked, this path is taken if selectedCategoryIdsStep1 is empty.
      // The button disable logic should prevent this, but as a safeguard:
      onClose();
      return;
    }
    if (preferencesPayload.length === 0 && currentStep === 2) {
      // If user went to step 2 but selected no attributes, and somehow submitted (e.g. if we allowed it)
      // we still want to save the categories from step 1. The filter above ensures this.
      // If selectedCategoryIdsStep1 is also empty (should not happen if UI logic is correct), then close.
      if (selectedCategoryIdsStep1.length === 0) {
        onClose();
        return;
      }
    }

    try {
      await performUpdateUserPreferences({
        preferences: preferencesPayload,
      });
      onClose();
    } catch (err) {
      console.error("Failed to save preferences:", err);
      // Error will be handled by the hook's error state, can show in modal if needed
    }
  };

  useEffect(() => {
    if (taxonomyError) {
      console.error("Taxonomy failed to load, closing interest modal.");
      onClose();
    }
  }, [taxonomyError, onClose]);

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

  const renderStep1 = () => (
    <div className="space-y-4">
      <p className="text-gray-600 dark:text-gray-400">
        Select your general areas of interest. You can refine these in the next
        step.
      </p>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {topLevelCategories.map((category) => {
          const isSelected = selectedCategoryIdsStep1.includes(category.id);
          const IconComponent = categoryIcons[category.name] || DefaultIcon;
          return (
            <Card
              key={category.id}
              onClick={() => handleSelectCategoryStep1(category.id)}
              className={`h-full cursor-pointer transition-all duration-150 hover:bg-gray-50 dark:hover:bg-gray-600 ${
                isSelected
                  ? "ring-2 ring-blue-500 dark:ring-blue-400"
                  : "ring-1 ring-gray-200 dark:ring-gray-700"
              }`}
            >
              <div className="flex h-full flex-col items-center justify-center p-3 text-center">
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
            </Card>
          );
        })}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-4">
      <Alert color="info" className="text-sm">
        Optionally refine your selected interests by choosing specific features.
        Click on an interest to expand and see available attributes.
      </Alert>
      {categoriesForStep2.length === 0 && (
        <p className="text-center text-gray-500 dark:text-gray-400">
          No interests selected in the previous step. Go back to select some.
        </p>
      )}
      <div className="space-y-3">
        {categoriesForStep2.map((category) => {
          const isExpanded = expandedCategoryIds.includes(category.id);
          const attributes = category.attributes || [];
          const hasAttributes = attributes.length > 0;
          const IconComponent = categoryIcons[category.name] || DefaultIcon;

          return (
            <div key={category.id} className="flex flex-col">
              <Card
                onClick={
                  hasAttributes
                    ? () => handleExpandCategory(category.id)
                    : undefined
                }
                className={`transition-all duration-150 ${
                  hasAttributes ? "cursor-pointer" : "cursor-default"
                } ${
                  isExpanded && hasAttributes
                    ? "ring-2 ring-blue-500 dark:ring-blue-400"
                    : hasAttributes
                      ? "hover:bg-gray-50 dark:hover:bg-gray-600"
                      : ""
                } ${!hasAttributes ? "bg-gray-50 opacity-70 dark:bg-gray-700" : ""}`}
              >
                <div className="flex items-center justify-between p-3 text-left">
                  <div className="flex items-center">
                    <IconComponent className="mr-3 h-7 w-7 flex-shrink-0 text-blue-600 dark:text-blue-500" />
                    <div>
                      <h5 className="text-md font-semibold text-gray-900 dark:text-white">
                        {category.name}
                      </h5>
                      {category.description && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {category.description}
                        </p>
                      )}
                      {!hasAttributes && (
                        <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                          (No specific attributes to refine for this interest)
                        </p>
                      )}
                    </div>
                  </div>
                  {hasAttributes && (
                    <div>
                      {isExpanded ? (
                        <HiChevronUp className="h-5 w-5 text-gray-500" />
                      ) : (
                        <HiChevronDown className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {isExpanded && hasAttributes && (
                <div className="mt-2 space-y-3 rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800">
                  {attributes.map((attribute) => (
                    <div key={attribute.name}>
                      <h6 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {attribute.description || attribute.name}
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
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <Modal show={show} size="4xl" popup onClose={onClose}>
      <div className="p-4">
        <ModalHeader>
          {currentStep === 1
            ? "Step 1: Select Your Interests"
            : "Step 2: Refine Your Interests"}
        </ModalHeader>
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
        {!isLoadingTaxonomy && !taxonomyError && taxonomyData && (
          <>
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
          </>
        )}
      </ModalBody>
      <ModalFooter>
        {currentStep === 1 && (
          <>
            <Button
              color="alternative"
              onClick={onClose}
              disabled={isUpdatingUserPreferences}
            >
              Skip for now
            </Button>
            <Button
              onClick={() => setCurrentStep(2)}
              disabled={
                isLoadingTaxonomy ||
                selectedCategoryIdsStep1.length === 0 ||
                isUpdatingUserPreferences
              }
            >
              Next <HiArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </>
        )}
        {currentStep === 2 && (
          <>
            <Button
              color="alternative"
              onClick={() => setCurrentStep(1)}
              disabled={isUpdatingUserPreferences}
            >
              <HiArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                isLoadingTaxonomy ||
                isUpdatingUserPreferences ||
                selectedCategoryIdsStep1.length === 0 // Safeguard
              }
            >
              {isUpdatingUserPreferences ? (
                <>
                  <Spinner size="sm" />
                  <span className="pl-3">Saving...</span>
                </>
              ) : (
                "Save Preferences"
              )}
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
}
