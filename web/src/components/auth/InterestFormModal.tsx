import { useState, useEffect, useMemo } from "react";
import {
  Modal,
  Button,
  Card,
  Spinner,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Badge,
} from "flowbite-react";
import {
  PreferenceItem,
  TaxonomyCategory,
} from "../../api/types/data-contracts";
import {
  HiChevronDown,
  HiChevronUp,
  // Import icons for categories
  HiOutlineDesktopComputer, // Electronics
  HiOutlineShoppingBag, // Fashion
  HiOutlineHome, // Home & Garden (covers Home)
  HiOutlineSparkles, // Beauty & Personal Care (covers Beauty)
  HiOutlineBookOpen, // Media (Books, Movies, etc.)
  HiOutlineHeart, // Health & Wellness
  HiOutlinePuzzle, // Toys & Games
  HiOutlineBriefcase, // Office Supplies
  HiOutlineKey, // Gaming (Changed from HiOutlineKey)
  HiOutlineGlobeAlt, // Travel
  HiOutlineShoppingCart, // Grocery
  HiOutlineGift, // Jewelry & Watches, Gifts
  HiOutlineCode, // Software
  HiQuestionMarkCircle, // Default
} from "react-icons/hi";
import { useTaxonomy } from "../../api/hooks/useTaxonomyHooks";
import { useUpdateUserPreferences } from "../../api/hooks/useUserHooks";
import ErrorDisplay from "../common/ErrorDisplay";

// --- Icon Mapping ---
const categoryIcons: { [key: string]: React.ElementType } = {
  Electronics: HiOutlineDesktopComputer,
  Fashion: HiOutlineShoppingBag,
  Home: HiOutlineHome, // Covers Home & Garden, Tools, Furniture etc.
  Beauty: HiOutlineSparkles,
  Media: HiOutlineBookOpen,
  "Health & Wellness": HiOutlineHeart,
  "Toys & Games": HiOutlinePuzzle,
  "Office Supplies": HiOutlineBriefcase,
  Gaming: HiOutlineKey, // Corrected Icon
  Travel: HiOutlineGlobeAlt,
  Grocery: HiOutlineShoppingCart,
  "Jewelry & Watches": HiOutlineGift, // Covers Jewelry
  Gifts: HiOutlineGift,
  Software: HiOutlineCode,
  // Add mappings for other new top-level categories if needed
  // If a category doesn't have a specific icon, it will use DefaultIcon
};
const DefaultIcon = HiQuestionMarkCircle;
// --- End Icon Mapping ---

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

  const [selectedSubCategoryIds, setSelectedSubCategoryIds] = useState<
    string[]
  >([]);
  const [expandedCategoryIds, setExpandedCategoryIds] = useState<string[]>([]);

  const topLevelCategories = useMemo(() => {
    return (
      taxonomyData?.categories
        .filter((cat) => !cat.parent_id)
        .sort((a, b) => a.name.localeCompare(b.name)) || []
    );
  }, [taxonomyData]);

  const subCategoriesMap = useMemo(() => {
    const map = new Map<string, TaxonomyCategory[]>();
    if (taxonomyData?.categories) {
      for (const category of taxonomyData.categories) {
        if (category.parent_id) {
          const children = map.get(category.parent_id) || [];
          children.push(category);
          map.set(
            category.parent_id,
            children.sort((a, b) => a.name.localeCompare(b.name)),
          );
        }
      }
    }
    return map;
  }, [taxonomyData]);

  const handleExpandCategory = (categoryId: string) => {
    setExpandedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  };

  const handleSelectSubCategory = (subCategoryId: string) => {
    setSelectedSubCategoryIds((prev) =>
      prev.includes(subCategoryId)
        ? prev.filter((id) => id !== subCategoryId)
        : [...prev, subCategoryId],
    );
  };

  const handleSubmit = async () => {
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
                to see more options. Choose at least one specific interest.
              </p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
                {topLevelCategories.map((category) => {
                  const isExpanded = expandedCategoryIds.includes(category.id);
                  const subCategories = subCategoriesMap.get(category.id) || [];
                  const hasSubCategories = subCategories.length > 0;
                  // --- Ensure icon mapping uses the correct category name ---
                  const IconComponent =
                    categoryIcons[category.name] || DefaultIcon;

                  return (
                    <div key={category.id} className="flex flex-col">
                      <Card
                        onClick={
                          hasSubCategories
                            ? () => handleExpandCategory(category.id)
                            : undefined
                        }
                        className={`h-full cursor-pointer transition-all duration-150 ${isExpanded ? "ring-2 ring-blue-500 dark:ring-blue-400" : "hover:bg-gray-50 dark:hover:bg-gray-600"}`}
                      >
                        {/* --- Centering Content --- */}
                        {/* The flex container with items-center should center the content horizontally */}
                        <div className="flex h-full flex-col items-center justify-between p-3 text-center">
                          {/* Content Block (Icon, Title, Description) */}
                          <div className="flex flex-col items-center">
                            {" "}
                            {/* Ensure this inner div also centers its items */}
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
                          {/* Chevron Block */}
                          {hasSubCategories && (
                            <div className="mt-2">
                              {isExpanded ? (
                                <HiChevronUp className="h-5 w-5 text-gray-500" />
                              ) : (
                                <HiChevronDown className="h-5 w-5 text-gray-500" />
                              )}
                            </div>
                          )}
                          {!hasSubCategories && (
                            <div className="mt-2 h-5 w-5"></div> // Placeholder for alignment
                          )}
                        </div>
                        {/* --- End Centering Content --- */}
                      </Card>

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
                                  className="cursor-pointer px-2 py-1 text-sm"
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
            selectedSubCategoryIds.length === 0 ||
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
