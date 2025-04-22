import { useState, useEffect, useMemo } from "react"; // <-- Import useMemo
import {
  Modal,
  Button,
  Card,
  Spinner,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Badge, // <-- Import Badge for subcategories
} from "flowbite-react";
import {
  PreferenceItem,
  TaxonomyCategory,
} from "../../api/types/data-contracts"; // <-- Import TaxonomyCategory
import { HiChevronDown, HiChevronUp } from "react-icons/hi"; // <-- Icons for expand/collapse
import { useTaxonomy } from "../../api/hooks/useTaxonomyHooks"; // <-- Import useTaxonomy
import { useUpdateUserPreferences } from "../../api/hooks/useUserHooks"; // <-- Import useUpdateUserPreferences
import ErrorDisplay from "../common/ErrorDisplay"; // <-- Import ErrorDisplay

interface InterestFormModalProps {
  show: boolean;
  onClose: () => void;
}

export function InterestFormModal({ show, onClose }: InterestFormModalProps) {
  const {
    data: taxonomyData,
    isLoading: isLoadingTaxonomy,
    error: taxonomyError,
  } = useTaxonomy();
  const updateUserPreferences = useUpdateUserPreferences();

  // State for selected sub-category IDs
  const [selectedSubCategoryIds, setSelectedSubCategoryIds] = useState<
    string[]
  >([]);
  // State to track the currently expanded top-level category
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(
    null,
  );

  // Memoize top-level categories
  const topLevelCategories = useMemo(() => {
    return taxonomyData?.categories.filter((cat) => !cat.parent_id) || [];
  }, [taxonomyData]);

  // Memoize subcategories mapped by their parent ID
  const subCategoriesMap = useMemo(() => {
    const map = new Map<string, TaxonomyCategory[]>();
    if (taxonomyData?.categories) {
      for (const category of taxonomyData.categories) {
        if (category.parent_id) {
          const children = map.get(category.parent_id) || [];
          children.push(category);
          map.set(category.parent_id, children);
        }
      }
    }
    return map;
  }, [taxonomyData]);

  // Handler to expand/collapse a top-level category
  const handleExpandCategory = (categoryId: string) => {
    setExpandedCategoryId((prev) => (prev === categoryId ? null : categoryId));
  };

  // Handler to select/deselect a subcategory
  const handleSelectSubCategory = (subCategoryId: string) => {
    setSelectedSubCategoryIds((prev) =>
      prev.includes(subCategoryId)
        ? prev.filter((id) => id !== subCategoryId)
        : [...prev, subCategoryId],
    );
  };

  const handleSubmit = async () => {
    // Submit only the selected subcategory IDs
    const preferences: PreferenceItem[] = selectedSubCategoryIds.map((id) => ({
      category: id,
      score: 1.0,
    }));

    try {
      await updateUserPreferences.mutateAsync({ preferences });
      onClose();
    } catch (err) {
      console.error("Failed to save preferences:", err);
    }
  };

  useEffect(() => {
    if (taxonomyError) {
      console.error("Taxonomy failed to load, closing interest modal.");
      onClose();
    }
  }, [taxonomyError, onClose]);

  return (
    <Modal show={show} size="4xl" popup onClose={onClose}>
      {" "}
      {/* Increased size */}
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
                to see more options.
              </p>
              {/* Render Top-Level Categories */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {topLevelCategories.map((category) => {
                  const isExpanded = expandedCategoryId === category.id;
                  const subCategories = subCategoriesMap.get(category.id) || [];
                  const hasSubCategories = subCategories.length > 0;

                  return (
                    <div key={category.id} className="flex flex-col">
                      <Card
                        onClick={
                          hasSubCategories
                            ? () => handleExpandCategory(category.id)
                            : undefined
                        } // Only expandable if it has children
                        className={`h-full cursor-pointer transition-all duration-150 ${isExpanded ? "ring-2 ring-blue-500 dark:ring-blue-400" : "hover:bg-gray-50 dark:hover:bg-gray-600"}`} // Added h-full
                      >
                        <div className="flex h-full flex-col items-center justify-between p-2 text-center">
                          {" "}
                          {/* Added h-full and justify-between */}
                          <div>
                            {" "}
                            {/* Wrap text content */}
                            <h5 className="text-md font-semibold text-gray-900 dark:text-white">
                              {category.name}
                            </h5>
                            {category.description && (
                              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                                {category.description}
                              </p>
                            )}
                          </div>
                          {/* Add expand/collapse icon if it has subcategories */}
                          {hasSubCategories && (
                            <div className="mt-2">
                              {" "}
                              {/* Keep margin-top */}
                              {isExpanded ? (
                                <HiChevronUp className="h-5 w-5 text-gray-500" />
                              ) : (
                                <HiChevronDown className="h-5 w-5 text-gray-500" />
                              )}
                            </div>
                          )}
                          {/* Add a placeholder div if no subcategories to maintain structure */}
                          {!hasSubCategories && (
                            <div className="mt-2 h-5 w-5"></div>
                          )}
                        </div>
                      </Card>

                      {/* Render Subcategories if Expanded */}
                      {isExpanded && hasSubCategories && (
                        <div className="mt-2 space-y-2 rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-600 dark:bg-gray-800">
                          <h6 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                            Refine '{category.name}'
                          </h6>
                          <div className="flex flex-wrap gap-2">
                            {subCategories.map((subCat) => {
                              const isSelected =
                                selectedSubCategoryIds.includes(subCat.id);
                              return (
                                <Badge
                                  key={subCat.id}
                                  color={isSelected ? "info" : "gray"}
                                  onClick={() =>
                                    handleSelectSubCategory(subCat.id)
                                  }
                                  className="cursor-pointer px-2 py-1 text-sm" // Adjusted padding/size
                                  // title={subCat.description || undefined} // Optional: show description on hover
                                >
                                  {subCat.name}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}
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
            selectedSubCategoryIds.length === 0 || // Disable if no subcategories selected
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
