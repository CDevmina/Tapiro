import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Button,
  Spinner,
  Alert,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Label,
  TextInput,
  Select,
  RangeSlider,
  List, // Import List
  ListItem, // Import ListItem
} from "flowbite-react";
import {
  HiInformationCircle,
  HiPencil,
  HiTrash,
  HiPlus,
  HiUser,
  HiSparkles,
  HiOutlineUserCircle,
  HiOutlineCake,
  HiOutlineGlobeAlt,
  HiOutlineCash,
  // --- End Add icons ---
} from "react-icons/hi";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import {
  useUserProfile,
  useUpdateUserProfile,
  useUserPreferences,
  useUpdateUserPreferences,
} from "../../api/hooks/useUserHooks";
import { useTaxonomy } from "../../api/hooks/useTaxonomyHooks";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorDisplay from "../../components/common/ErrorDisplay";
import {
  UserUpdate,
  PreferenceItem,
  TaxonomyCategory,
} from "../../api/types/data-contracts";

// --- Form Types ---
type DemographicsFormData = Pick<
  UserUpdate,
  "gender" | "age" | "country" | "incomeBracket"
>;
type PreferenceFormData = {
  category: string;
  score: number;
  attributes?: Record<string, string | undefined>;
};

// --- Mini Demographic Card Component (Add this) ---
interface DemoInfoCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number | null | undefined;
  isLoading?: boolean; // Optional loading state if needed later
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

const UserPreferencesPage: React.FC = () => {
  // --- Data Fetching ---
  const {
    data: userProfile,
    isLoading: profileLoading,
    error: profileError,
  } = useUserProfile();
  const {
    data: preferencesData,
    isLoading: preferencesLoading,
    error: preferencesError,
  } = useUserPreferences();
  const {
    data: taxonomyData,
    isLoading: taxonomyLoading,
    error: taxonomyError,
  } = useTaxonomy();

  // --- Mutations ---
  const {
    mutate: updateProfile,
    isPending: isUpdatingProfile,
    error: updateProfileError,
  } = useUpdateUserProfile();
  const {
    mutate: updatePreferences,
    isPending: isUpdatingPreferences,
    error: updatePreferencesError,
  } = useUpdateUserPreferences();

  // --- State ---
  const [isEditingDemographics, setIsEditingDemographics] = useState(false);
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);
  const [editingPreferenceIndex, setEditingPreferenceIndex] = useState<
    number | null
  >(null);

  // --- Forms ---
  const {
    register: registerDemo,
    handleSubmit: handleDemoSubmit,
    reset: resetDemoForm,
    formState: { isDirty: isDemoDirty },
  } = useForm<DemographicsFormData>();

  const {
    register: registerPref,
    handleSubmit: handlePrefSubmit,
    reset: resetPrefForm,
    control: prefControl,
    watch: watchPref,
    formState: { errors: prefErrors },
  } = useForm<PreferenceFormData>({
    defaultValues: { category: "", attributes: {}, score: 50 },
  });

  useEffect(() => {
    if (userProfile && !isEditingDemographics) {
      resetDemoForm({
        gender: userProfile?.demographicData?.gender || "",
        age: userProfile?.demographicData?.age || undefined,
        country: userProfile?.demographicData?.country || "",
        incomeBracket: userProfile?.demographicData?.incomeBracket || "",
      });
    }
  }, [userProfile, isEditingDemographics, resetDemoForm]);

  // Reset preference form when modal opens/closes or editing target changes
  useEffect(() => {
    if (showPreferenceModal) {
      if (
        editingPreferenceIndex !== null &&
        preferencesData?.preferences?.[editingPreferenceIndex]
      ) {
        // Editing existing preference
        const pref = preferencesData.preferences[editingPreferenceIndex];
        const formAttributes: Record<string, string | undefined> = {};
        if (pref.attributes) {
          Object.entries(pref.attributes).forEach(([key, valueObj]) => {
            let displayValue: string | undefined = undefined;
            if (typeof valueObj === "object" && valueObj !== null) {
              // Attempt to get the first key if it's an object like { "Blue": 1.0 }
              const firstKey = Object.keys(valueObj)[0];
              if (firstKey) displayValue = firstKey;
            } else if (typeof valueObj === "string") {
              // Handle simple string attributes if your API supports them
              displayValue = valueObj;
            }
            formAttributes[key] = displayValue;
          });
        }
        resetPrefForm({
          category: pref.category || "",
          attributes: formAttributes,
          score:
            pref.score !== null && pref.score !== undefined
              ? Math.round(pref.score * 100) // Convert 0-1 score to 0-100 for slider
              : 50, // Default slider value
        });
      } else {
        // Adding new preference
        resetPrefForm({ category: "", attributes: {}, score: 50 });
      }
    }
  }, [
    showPreferenceModal,
    editingPreferenceIndex,
    preferencesData,
    resetPrefForm,
  ]);

  // --- Memos ---
  const { categoryMap, attributeMap } = useMemo(() => {
    const catMap = new Map<string, TaxonomyCategory>();
    const attrMap = new Map<string, Map<string, string>>(); // categoryId -> Map<attrName, attrDescription>
    if (taxonomyData?.categories) {
      taxonomyData.categories.forEach((cat) => {
        catMap.set(cat.id, cat);
        const catAttrs = new Map<string, string>();
        cat.attributes?.forEach((attr) => {
          catAttrs.set(attr.name, attr.description || attr.name);
        });
        // Include parent attributes (simple one-level for now)
        if (cat.parent_id) {
          const parentCat = taxonomyData.categories.find(
            (p) => p.id === cat.parent_id,
          );
          parentCat?.attributes?.forEach((attr) => {
            if (!catAttrs.has(attr.name)) {
              // Avoid overwriting child attributes
              catAttrs.set(attr.name, attr.description || attr.name);
            }
          });
        }
        attrMap.set(cat.id, catAttrs);
      });
    }
    return { categoryMap: catMap, attributeMap: attrMap };
  }, [taxonomyData]);

  const selectedCategoryId = watchPref("category");
  const availableAttributes = useMemo(() => {
    return attributeMap.get(selectedCategoryId) || new Map();
  }, [selectedCategoryId, attributeMap]);

  // --- Handlers ---
  const onDemoSubmit: SubmitHandler<DemographicsFormData> = (data) => {
    // Filter out empty strings before sending
    const payload: Partial<DemographicsFormData> = {};
    if (data.gender) payload.gender = data.gender;
    if (data.age) payload.age = data.age;
    if (data.country) payload.country = data.country;
    if (data.incomeBracket) payload.incomeBracket = data.incomeBracket;

    updateProfile(payload as UserUpdate, {
      // Cast as UserUpdate
      onSuccess: () => setIsEditingDemographics(false),
    });
  };

  const onPrefSubmit: SubmitHandler<PreferenceFormData> = (data) => {
    const currentPreferences = preferencesData?.preferences || [];
    let updatedPreferences: PreferenceItem[];

    // Format attributes for the API: { "brand": { "Apple": 1.0 }, "color": { "Blue": 1.0 } }
    const apiAttributes: Record<string, { [key: string]: number }> = {};
    if (data.attributes) {
      Object.entries(data.attributes).forEach(([key, value]) => {
        if (value && value.trim() !== "") {
          // Only include non-empty attributes
          apiAttributes[key] = { [value.trim()]: 1.0 }; // Assign score 1.0
        }
      });
    }

    const newPrefItem: PreferenceItem = {
      category: data.category,
      attributes: apiAttributes,
      score: data.score / 100, // Convert 0-100 slider value to 0-1 score
    };

    if (editingPreferenceIndex !== null) {
      // Update existing preference
      updatedPreferences = currentPreferences.map((pref, index) =>
        index === editingPreferenceIndex ? newPrefItem : pref,
      );
    } else {
      // Add new preference
      updatedPreferences = [...currentPreferences, newPrefItem];
    }

    updatePreferences(
      { preferences: updatedPreferences },
      {
        onSuccess: () => {
          setShowPreferenceModal(false);
          setEditingPreferenceIndex(null);
        },
      },
    );
  };

  const handleRemovePreference = (indexToRemove: number) => {
    const currentPreferences = preferencesData?.preferences || [];
    const updatedPreferences = currentPreferences.filter(
      (_, index) => index !== indexToRemove,
    );
    updatePreferences({ preferences: updatedPreferences });
  };

  const openAddModal = () => {
    setEditingPreferenceIndex(null);
    setShowPreferenceModal(true);
  };

  const openEditModal = (index: number) => {
    setEditingPreferenceIndex(index);
    setShowPreferenceModal(true);
  };

  // --- Render Logic ---
  const isLoading = profileLoading || preferencesLoading || taxonomyLoading;
  const error = profileError || preferencesError || taxonomyError;
  const isMutating = isUpdatingProfile || isUpdatingPreferences;

  if (isLoading) {
    return <LoadingSpinner message="Loading preferences..." />;
  }

  if (error) {
    return (
      <ErrorDisplay
        title="Error Loading Preferences"
        message="Could not load your preferences or profile information."
        error={error}
      />
    );
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h2 className="mb-8 text-3xl font-bold text-gray-900 dark:text-white">
        Manage Your Profile & Interests
      </h2>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* --- Demographics Section (Left Column on Large Screens) --- */}
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center text-xl font-semibold text-gray-900 dark:text-white">
              <HiUser className="mr-2 h-5 w-5" />
              About You
            </h3>
            {!isEditingDemographics && (
              <Button
                color="light"
                size="sm"
                onClick={() => setIsEditingDemographics(true)}
                disabled={isMutating}
              >
                <HiPencil className="mr-1 h-4 w-4" /> Edit
              </Button>
            )}
          </div>
          {updateProfileError && (
            <Alert color="failure" icon={HiInformationCircle} className="mt-4">
              Failed to update profile: {updateProfileError.message}
            </Alert>
          )}
          {isEditingDemographics ? (
            <form
              onSubmit={handleDemoSubmit(onDemoSubmit)}
              className="mt-4 space-y-4" // Use space-y for consistent spacing
            >
              <div>
                <Label htmlFor="gender">Gender</Label>
                <TextInput
                  id="gender"
                  {...registerDemo("gender")}
                  placeholder="e.g., Male, Female, Non-binary"
                />
              </div>
              <div>
                <Label htmlFor="age">Age</Label>
                <TextInput
                  id="age"
                  type="number"
                  {...registerDemo("age", { valueAsNumber: true })}
                  placeholder="e.g., 30"
                />
              </div>
              <div>
                <Label htmlFor="country">Country</Label>
                <TextInput
                  id="country"
                  {...registerDemo("country")}
                  placeholder="e.g., USA, Canada"
                />
              </div>
              <div>
                <Label htmlFor="incomeBracket">Income Bracket</Label>
                <TextInput
                  id="incomeBracket"
                  {...registerDemo("incomeBracket")}
                  placeholder="e.g., $50k-$75k, High"
                />
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button
                  color="gray"
                  onClick={() => setIsEditingDemographics(false)}
                  disabled={isMutating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isMutating || !isDemoDirty}>
                  {isUpdatingProfile ? (
                    <>
                      <Spinner size="sm" className="mr-2" /> Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          ) : (
            <div className="mt-4 space-y-3 text-sm">
              <DemoInfoCard
                icon={HiOutlineUserCircle}
                label="Gender"
                value={userProfile?.demographicData?.gender}
                isLoading={profileLoading}
              />
              <DemoInfoCard
                icon={HiOutlineCake}
                label="Age"
                value={userProfile?.demographicData?.age}
                isLoading={profileLoading}
              />
              <DemoInfoCard
                icon={HiOutlineGlobeAlt}
                label="Country"
                value={userProfile?.demographicData?.country}
                isLoading={profileLoading}
              />
              <DemoInfoCard
                icon={HiOutlineCash}
                label="Income"
                value={userProfile?.demographicData?.incomeBracket}
                isLoading={profileLoading}
              />
            </div>
          )}
        </Card>

        {/* --- Preferences Section (Right Column on Large Screens) --- */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center text-xl font-semibold text-gray-900 dark:text-white">
              <HiSparkles className="mr-2 h-5 w-5" />
              Your Interests
            </h3>
            <Button
              color="blue"
              size="sm"
              onClick={openAddModal}
              disabled={isMutating}
            >
              <HiPlus className="mr-1 h-4 w-4" /> Add Interest
            </Button>
          </div>
          {updatePreferencesError && (
            <Alert color="failure" icon={HiInformationCircle} className="mt-4">
              Failed to update preferences: {updatePreferencesError.message}
            </Alert>
          )}
          {isUpdatingPreferences && !showPreferenceModal && (
            <div className="my-4 flex items-center justify-center text-sm text-gray-500 dark:text-gray-400">
              <Spinner size="sm" /> <span className="ml-2">Saving...</span>
            </div>
          )}
          <div className="mt-4">
            {preferencesData?.preferences &&
            preferencesData.preferences.length > 0 ? (
              <List unstyled className="space-y-3">
                {preferencesData.preferences.map((pref, index) => {
                  // Extract attribute display logic
                  const attributesDisplay =
                    pref.attributes &&
                    Object.entries(pref.attributes).map(([key, valueObj]) => {
                      let displayValue = "[Complex Value]";
                      if (typeof valueObj === "object" && valueObj !== null) {
                        const firstKey = Object.keys(valueObj)[0];
                        if (firstKey) displayValue = firstKey;
                      } else if (typeof valueObj === "string") {
                        displayValue = valueObj;
                      }
                      return { key, displayValue };
                    });

                  return (
                    <ListItem
                      key={index}
                      className="flex flex-col items-start rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700"
                    >
                      <div className="mb-3 flex-grow sm:mb-0">
                        <span className="block text-base font-semibold text-gray-800 dark:text-gray-200">
                          {categoryMap.get(pref.category || "")?.name ||
                            "Unknown Category"}
                        </span>
                        <span className="block text-sm text-gray-600 dark:text-gray-400">
                          Score:{" "}
                          {pref.score !== null && pref.score !== undefined
                            ? Math.round(pref.score * 100)
                            : "N/A"}
                        </span>
                        {attributesDisplay && attributesDisplay.length > 0 && (
                          <div className="mt-1 text-xs">
                            {attributesDisplay.map(({ key, displayValue }) => (
                              <span
                                key={key}
                                className="mt-1 mr-1.5 inline-block rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-600 dark:text-gray-200"
                              >
                                <span className="font-medium">
                                  {attributeMap
                                    .get(pref.category || "")
                                    ?.get(key) || key}
                                  :
                                </span>{" "}
                                {displayValue}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-shrink-0 gap-2 self-end sm:self-center">
                        <Button
                          size="xs"
                          color="light"
                          onClick={() => openEditModal(index)}
                          disabled={isMutating}
                          aria-label="Edit interest"
                        >
                          <HiPencil />
                        </Button>
                        <Button
                          size="xs"
                          color="failure"
                          outline
                          onClick={() => handleRemovePreference(index)}
                          disabled={isMutating}
                          aria-label="Delete interest"
                        >
                          <HiTrash />
                        </Button>
                      </div>
                    </ListItem>
                  );
                })}
              </List>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400">
                You haven't added any specific interests yet. Click "Add
                Interest" to get started.
              </p>
            )}
          </div>
        </Card>
      </div>

      {/* --- Preference Add/Edit Modal --- */}
      <Modal
        show={showPreferenceModal}
        onClose={() => !isMutating && setShowPreferenceModal(false)}
        size="lg" // Slightly larger modal
      >
        <ModalHeader>
          {editingPreferenceIndex !== null
            ? "Edit Interest"
            : "Add New Interest"}
        </ModalHeader>
        <form onSubmit={handlePrefSubmit(onPrefSubmit)}>
          <ModalBody className="space-y-6">
            {/* Category Select */}
            <div>
              <Label htmlFor="category">Interest Category</Label>
              <Select
                id="category"
                {...registerPref("category", {
                  required: "Category is required",
                })}
                color={prefErrors.category ? "failure" : "gray"}
                disabled={editingPreferenceIndex !== null} // Disable category change when editing
                required
              >
                <option value="" disabled>
                  Select a category...
                </option>
                {Array.from(categoryMap.values())
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </Select>
              {prefErrors.category && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                  {prefErrors.category.message}
                </p>
              )}
            </div>

            {/* Attributes */}
            {selectedCategoryId && availableAttributes.size > 0 && (
              <fieldset className="rounded border p-4 dark:border-gray-600">
                <legend className="-ml-1 px-1 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Refine Interest (Optional)
                </legend>
                <div className="grid grid-cols-1 gap-4 pt-3 sm:grid-cols-2">
                  {Array.from(availableAttributes.entries()).map(
                    ([attrName, attrDesc]) => (
                      <div key={attrName}>
                        <Label
                          htmlFor={`attr-${attrName}`}
                          className="mb-1 text-xs"
                        >
                          {attrDesc || attrName}
                        </Label>
                        <TextInput
                          id={`attr-${attrName}`}
                          {...registerPref(`attributes.${attrName}`)}
                          placeholder={`e.g., ${attrName === "color" ? "Blue" : attrName === "brand" ? "Acme" : "Any"}`}
                          className="text-sm"
                        />
                      </div>
                    ),
                  )}
                </div>
              </fieldset>
            )}

            {/* Score Slider */}
            <div>
              <Label htmlFor="score">Interest Score (0-100)</Label>
              <Controller
                name="score"
                control={prefControl}
                render={({ field: { onChange, value } }) => (
                  <div className="mt-1 flex items-center gap-4">
                    <RangeSlider
                      id="score"
                      min={0}
                      max={100}
                      value={value ?? 50}
                      onChange={(e) => onChange(parseInt(e.target.value, 10))}
                      className="flex-grow"
                    />
                    <span className="w-10 text-right text-sm font-medium text-gray-900 dark:text-white">
                      {value ?? 50}
                    </span>
                  </div>
                )}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                How interested are you in this category? (0 = Not at all, 100 =
                Very interested)
              </p>
            </div>
          </ModalBody>
          <ModalFooter className="justify-end">
            <Button
              color="gray"
              onClick={() => setShowPreferenceModal(false)}
              disabled={isMutating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isMutating}>
              {isUpdatingPreferences ? (
                <>
                  <Spinner size="sm" className="mr-2" /> Saving...
                </>
              ) : editingPreferenceIndex !== null ? (
                "Save Changes"
              ) : (
                "Add Interest"
              )}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </div>
  );
};

export default UserPreferencesPage;
