import React, { useState, useEffect, useMemo } from "react"; // Ensure React is imported
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
} from "flowbite-react";
import { HiInformationCircle, HiPencil, HiTrash, HiPlus } from "react-icons/hi";
import { useForm, Controller, SubmitHandler } from "react-hook-form";
import {
  useUserProfile,
  useUpdateUserProfile,
  useUserPreferences,
  useUpdateUserPreferences,
} from "../api/hooks/useUserHooks";
import { useTaxonomy } from "../api/hooks/useTaxonomyHooks";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorDisplay from "../components/common/ErrorDisplay";
import {
  UserUpdate,
  PreferenceItem,
  TaxonomyCategory,
  // Removed AttributeDistribution as it's not directly used in the form/display logic now
} from "../api/types/data-contracts";

// --- Form Types ---
// ... (Keep existing form types: DemographicsFormData, PreferenceFormData) ...
type DemographicsFormData = Pick<
  UserUpdate,
  "gender" | "age" | "country" | "incomeBracket"
>;
type PreferenceFormData = {
  category: string;
  score: number;
  attributes?: Record<string, string | undefined>;
};

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

  // --- Effects ---
  // ... (Keep existing useEffect hooks for resetting forms) ...
  // Reset demographics form when profile loads or editing starts/stops
  useEffect(() => {
    if (userProfile && !isEditingDemographics) {
      resetDemoForm({
        gender: userProfile.gender || "",
        age: userProfile.age || undefined,
        country: userProfile.country || "",
        incomeBracket: userProfile.incomeBracket || "",
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
              const firstKey = Object.keys(valueObj)[0];
              if (firstKey) displayValue = firstKey;
            } else if (typeof valueObj === "string") {
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
              ? Math.round(pref.score * 100)
              : 50,
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
  // ... (Keep existing useMemo hooks for categoryMap, attributeMap, availableAttributes) ...
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
  // ... (Keep existing onDemoSubmit, onPrefSubmit, handleRemovePreference) ...
  const onDemoSubmit: SubmitHandler<DemographicsFormData> = (data) => {
    updateProfile(data, {
      onSuccess: () => setIsEditingDemographics(false),
    });
  };

  const onPrefSubmit: SubmitHandler<PreferenceFormData> = (data) => {
    const currentPreferences = preferencesData?.preferences || [];
    let updatedPreferences: PreferenceItem[];

    const cleanedAttributes: Record<string, string> = {};
    if (data.attributes) {
      Object.entries(data.attributes).forEach(([key, value]) => {
        if (value) {
          cleanedAttributes[key] = value;
        }
      });
    }

    // Using Option A: Send empty object for attributes for now
    const apiAttributes = {};
    // If you implement Option B (formatting attributes):
    /*
    const apiAttributes: Record<string, { [key: string]: number }> = {};
     Object.entries(cleanedAttributes).forEach(([key, value]) => {
       apiAttributes[key] = { [value]: 1.0 }; // Example structure
     });
    */

    const newPrefItem: PreferenceItem = {
      category: data.category,
      attributes: apiAttributes,
      score: data.score / 100, // Convert 0-100 to 0-1
    };

    if (editingPreferenceIndex !== null) {
      updatedPreferences = currentPreferences.map((pref, index) =>
        index === editingPreferenceIndex ? newPrefItem : pref,
      );
    } else {
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

  // --- Define Modal Handlers ---
  const openAddModal = () => {
    setEditingPreferenceIndex(null); // Ensure we are adding, not editing
    setShowPreferenceModal(true);
  };

  const openEditModal = (index: number) => {
    setEditingPreferenceIndex(index); // Set the index of the item to edit
    setShowPreferenceModal(true);
  };
  // --- End Define Modal Handlers ---

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
      <h2 className="mb-6 text-2xl font-bold text-gray-900 dark:text-white">
        Manage Your Preferences & Profile
      </h2>

      {/* --- Demographics Section --- */}
      <Card className="mb-8">
        {/* ... (Keep existing Demographics JSX, including form and display logic) ... */}
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            About You
          </h3>
          {!isEditingDemographics && (
            <Button
              color="light"
              size="sm"
              onClick={() => setIsEditingDemographics(true)}
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
            className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2"
          >
            {/* Form Fields: Gender, Age, Country, Income */}
            <div>
              <Label htmlFor="gender">Gender</Label>
              <TextInput id="gender" {...registerDemo("gender")} />
            </div>
            <div>
              <Label htmlFor="age">Age</Label>
              <TextInput
                id="age"
                type="number"
                {...registerDemo("age", { valueAsNumber: true })}
              />
            </div>
            <div>
              <Label htmlFor="country">Country</Label>
              <TextInput id="country" {...registerDemo("country")} />
            </div>
            <div>
              <Label htmlFor="incomeBracket">Income Bracket</Label>
              <TextInput
                id="incomeBracket"
                {...registerDemo("incomeBracket")}
              />
            </div>
            <div className="col-span-1 flex items-end justify-end gap-3 md:col-span-2">
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
          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <p>
              <span className="font-medium text-gray-600 dark:text-gray-400">
                Gender:
              </span>{" "}
              {userProfile?.gender || "Not set"}
            </p>
            <p>
              <span className="font-medium text-gray-600 dark:text-gray-400">
                Age:
              </span>{" "}
              {userProfile?.age || "Not set"}
            </p>
            <p>
              <span className="font-medium text-gray-600 dark:text-gray-400">
                Country:
              </span>{" "}
              {userProfile?.country || "Not set"}
            </p>
            <p>
              <span className="font-medium text-gray-600 dark:text-gray-400">
                Income:
              </span>{" "}
              {userProfile?.incomeBracket || "Not set"}
            </p>
          </div>
        )}
      </Card>

      {/* --- Preferences Section --- */}
      <Card>
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Your Interests
          </h3>
          {/* Use the defined handler */}
          <Button color="success" size="sm" onClick={openAddModal}>
            <HiPlus className="mr-1 h-4 w-4" /> Add Interest
          </Button>
        </div>
        {updatePreferencesError && (
          <Alert color="failure" icon={HiInformationCircle} className="mt-4">
            Failed to update preferences: {updatePreferencesError.message}
          </Alert>
        )}
        {isUpdatingPreferences &&
          !showPreferenceModal && ( // Only show global spinner if modal isn't open
            <div className="my-4 flex items-center justify-center">
              <Spinner size="sm" /> <span className="ml-2">Saving...</span>
            </div>
          )}
        <div className="mt-4 space-y-3">
          {preferencesData?.preferences &&
          preferencesData.preferences.length > 0 ? (
            preferencesData.preferences.map((pref, index) => (
              <div
                key={index}
                className="rounded-lg border p-4 dark:border-gray-700"
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-semibold text-gray-800 dark:text-gray-200">
                    {categoryMap.get(pref.category || "")?.name ||
                      "Unknown Category"}
                  </span>
                  <div className="flex gap-2">
                    {/* Use the defined handler */}
                    <Button
                      size="xs"
                      color="light"
                      onClick={() => openEditModal(index)}
                      disabled={isMutating}
                    >
                      <HiPencil />
                    </Button>
                    <Button
                      size="xs"
                      color="failure"
                      outline
                      onClick={() => handleRemovePreference(index)}
                      disabled={isMutating}
                    >
                      <HiTrash />
                    </Button>
                  </div>
                </div>
                <div className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                  Score:{" "}
                  {pref.score !== null && pref.score !== undefined
                    ? Math.round(pref.score * 100)
                    : "N/A"}
                </div>
                {pref.attributes && Object.keys(pref.attributes).length > 0 && (
                  <div className="text-xs">
                    {Object.entries(pref.attributes).map(([key, valueObj]) => {
                      let displayValue = "[Complex Value]";
                      if (typeof valueObj === "object" && valueObj !== null) {
                        const firstKey = Object.keys(valueObj)[0];
                        if (firstKey) displayValue = firstKey;
                      } else if (typeof valueObj === "string") {
                        displayValue = valueObj;
                      }

                      return (
                        <span
                          key={key}
                          className="mr-1 inline-block rounded bg-gray-100 px-1.5 py-0.5 dark:bg-gray-600"
                        >
                          <span className="font-medium">
                            {/* Look up attribute description/name */}
                            {attributeMap.get(pref.category || "")?.get(key) ||
                              key}
                            :
                          </span>{" "}
                          {displayValue}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400">
              You haven't added any specific interests yet.
            </p>
          )}
        </div>
      </Card>

      {/* --- Preference Add/Edit Modal --- */}
      <Modal
        show={showPreferenceModal}
        onClose={() => !isMutating && setShowPreferenceModal(false)}
      >
        <ModalHeader>
          {editingPreferenceIndex !== null
            ? "Edit Interest"
            : "Add New Interest"}
        </ModalHeader>
        <form onSubmit={handlePrefSubmit(onPrefSubmit)}>
          <ModalBody className="space-y-4">
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
              >
                <option value="" disabled>
                  Select a category...
                </option>
                {/* Populate with categories from taxonomy */}
                {Array.from(categoryMap.values())
                  // Optionally filter out categories that are parents?
                  // .filter(cat => !taxonomyData?.categories.some(c => c.parent_id === cat.id))
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
              <fieldset className="rounded border p-3 dark:border-gray-600">
                <legend className="px-1 text-sm font-medium dark:text-gray-300">
                  Refine Interest (Optional)
                </legend>
                <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
                  {Array.from(availableAttributes.entries()).map(
                    ([attrName, attrDesc]) => (
                      <div key={attrName}>
                        <Label htmlFor={`attr-${attrName}`} className="text-xs">
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
                  <div className="flex items-center gap-4">
                    <RangeSlider
                      id="score"
                      min={0}
                      max={100}
                      value={value ?? 50}
                      onChange={(e) => onChange(parseInt(e.target.value, 10))}
                      className="flex-grow"
                    />
                    <span className="w-10 text-right font-medium">
                      {value ?? 50}
                    </span>
                  </div>
                )}
              />
            </div>
          </ModalBody>
          <ModalFooter>
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
