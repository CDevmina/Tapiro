import React, { useState, useEffect, useMemo } from "react"; // Add React import
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
  List,
  ListItem,
  Badge, // Import Badge
  Tooltip, // Import Tooltip
} from "flowbite-react";
import {
  HiUser,
  HiPencil,
  HiInformationCircle,
  HiOutlineCalendar, // Example icon for Age
  HiOutlineGlobeAlt, // Example icon for Country
  HiOutlineCurrencyDollar, // Example icon for Income
  HiOutlineIdentification, // Example icon for Gender
  HiOutlineUsers, // Example icon for Relationship
  HiOutlineBriefcase, // Example icon for Employment
  HiOutlineAcademicCap, // Example icon for Education
  HiOutlineUserGroup, // Example icon for Kids
  HiCheckCircle, // Icon for verified
  HiQuestionMarkCircle, // Icon for inferred/unverified
  HiTrash,
  HiPlus,
  HiOutlineHeart, // Icon for correcting
} from "react-icons/hi";
import {
  useUserProfile,
  useUserPreferences,
  useUpdateUserProfile, // Import the hook
  useUpdateUserPreferences,
} from "../../api/hooks/useUserHooks"; // Adjust path as needed
import { useTaxonomy } from "../../api/hooks/useTaxonomyHooks"; // Import useTaxonomy separately
import {
  UserUpdate,
  PreferenceItem,
  TaxonomyCategory,
  DemographicData, // Import DemographicData type
  TaxonomyAttribute, // Import TaxonomyAttribute type
} from "../../api/types/data-contracts"; // Adjust path as needed
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorDisplay from "../../components/common/ErrorDisplay";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import countryData from "../../data/countries.json";

// --- Form Types ---
// This form now handles ALL demographic fields the user can provide
type DemographicsFormData = {
  gender?: DemographicData["gender"];
  age?: DemographicData["age"];
  country?: DemographicData["country"];
  incomeBracket?: DemographicData["incomeBracket"];
  // Add fields that were previously only inferred
  hasKids?: boolean | null; // Use boolean for hasKids
  relationshipStatus?: DemographicData["inferredRelationshipStatus"];
  employmentStatus?: DemographicData["inferredEmploymentStatus"];
  educationLevel?: DemographicData["inferredEducationLevel"];
};
// ... (PreferenceFormData remains the same) ...
type PreferenceFormData = {
  category: string;
  score: number;
  attributes?: Record<string, string | undefined>;
};

// --- Define options for selects (Keep existing) ---
const genderOptions = [
  { value: "", label: "Select Gender" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const incomeOptions = [
  { value: "", label: "Select Income Bracket" },
  { value: "<25k", label: "< $25,000" },
  { value: "25k-50k", label: "$25,000 - $49,999" },
  { value: "50k-100k", label: "$50,000 - $99,999" },
  { value: "100k-200k", label: "$100,000 - $199,999" },
  { value: ">200k", label: "> $200,000" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

// --- Country Options (Keep existing) ---
interface CountryOption {
  value: string;
  label: string;
}
const typedCountryData: CountryOption[] = Object.entries(countryData).map(
  ([code, name]) => ({ value: code, label: name }),
);
typedCountryData.sort((a, b) => a.label.localeCompare(b.label));
const countryOptions: CountryOption[] = [
  { value: "", label: "Select Country" },
  ...typedCountryData,
];

// --- NEW Options for Inferred Fields ---
const hasKidsOptions = [
  { value: "", label: "Select Option" }, // Represents null
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
];

const relationshipStatusOptions = [
  { value: "", label: "Select Status" }, // Represents null
  { value: "single", label: "Single" },
  { value: "relationship", label: "In a Relationship" },
  { value: "married", label: "Married" },
  // Add other relevant options if needed, matching the enum in DemographicData
];

const employmentStatusOptions = [
  { value: "", label: "Select Status" }, // Represents null
  { value: "employed", label: "Employed" },
  { value: "unemployed", label: "Unemployed" },
  { value: "student", label: "Student" },
  // Add other relevant options if needed
];

const educationLevelOptions = [
  { value: "", label: "Select Level" }, // Represents null
  { value: "high_school", label: "High School" },
  { value: "bachelors", label: "Bachelor's Degree" },
  { value: "masters", label: "Master's Degree" },
  { value: "doctorate", label: "Doctorate" },
  // Add other relevant options if needed
];
// --- End NEW Options ---

// --- NEW: Helper to format demographic values ---
const formatValue = (
  value: string | number | boolean | null | undefined,
): string => {
  if (value === null || value === undefined || value === "") return "Not set";
  if (typeof value === "boolean") return value ? "Yes" : "No"; // Format boolean for 'hasKids'
  // Add specific formatting if needed (e.g., capitalize)
  if (typeof value === "string") {
    return value.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()); // Capitalize words
  }
  return String(value);
};

// --- UPDATED: Demographic Info Display Component ---
interface DemoInfoDisplayProps {
  icon: React.ElementType;
  label: string;
  // Keep userProvidedValue for original fields
  userProvidedValue: string | number | boolean | null | undefined;
  inferredValue?: string | number | boolean | null | undefined; // Can be boolean for hasKids
  isVerified?: boolean;
  verificationFieldName?: keyof DemographicData; // e.g., 'genderIsVerified'
  onVerify?: (fieldName: keyof DemographicData) => void;
  onEdit?: () => void; // Function to open the edit form
  isLoading?: boolean;
  isMutating?: boolean; // To disable buttons during mutation
  isEditingDemographics?: boolean;
}

const DemoInfoDisplay: React.FC<DemoInfoDisplayProps> = ({
  icon: Icon,
  label,
  userProvidedValue, // This now represents the USER's input for ALL fields
  inferredValue,
  isVerified,
  verificationFieldName,
  onVerify,
  onEdit,
  isLoading,
  isMutating,
  isEditingDemographics,
}) => {
  // Determine the primary value to display: User's input takes precedence
  const primaryValue =
    userProvidedValue !== null &&
    userProvidedValue !== undefined &&
    userProvidedValue !== ""
      ? userProvidedValue
      : inferredValue; // Fall back to inferred if user hasn't provided

  const displayValue = formatValue(primaryValue);

  // Determine if the displayed value is inferred and unverified
  const isDisplayingInferredUnverified =
    (userProvidedValue === null ||
      userProvidedValue === undefined ||
      userProvidedValue === "") && // User hasn't provided
    inferredValue !== null &&
    inferredValue !== undefined && // Inferred value exists
    !isVerified; // And it's not verified

  return (
    <div className="flex items-start rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
      <Icon className="mt-1 mr-3 h-6 w-6 flex-shrink-0 text-gray-500 dark:text-gray-400" />
      <div className="flex-grow">
        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
          {label}
        </p>
        <p className="text-lg font-semibold text-gray-900 dark:text-white">
          {isLoading ? (
            <Spinner size="sm" />
          ) : (
            <>
              {displayValue}
              {/* Show badge only if displaying an inferred value */}
              {(userProvidedValue === null ||
                userProvidedValue === undefined ||
                userProvidedValue === "") &&
                inferredValue !== null &&
                inferredValue !== undefined && (
                  <Tooltip
                    content={
                      isVerified ? "Confirmed by you" : "Inferred by Tapiro"
                    }
                  >
                    <Badge
                      color={isVerified ? "success" : "warning"}
                      icon={isVerified ? HiCheckCircle : HiQuestionMarkCircle}
                      className="ml-2 inline-flex"
                    >
                      {isVerified ? "Confirmed" : "Inferred"}
                    </Badge>
                  </Tooltip>
                )}
            </>
          )}
        </p>
      </div>
      {/* Action Buttons */}
      {!isLoading && !isEditingDemographics && (
        <div className="ml-auto flex flex-col space-y-1 pl-2">
          {/* Show Verify button ONLY if displaying an inferred, unverified value */}
          {isDisplayingInferredUnverified &&
            verificationFieldName &&
            onVerify && (
              <Tooltip content="Confirm this inferred value is correct">
                <Button
                  color="success"
                  size="xs"
                  onClick={() => onVerify(verificationFieldName)}
                  disabled={isMutating}
                  className="w-full justify-center"
                >
                  {isMutating ? (
                    <Spinner size="xs" className="mr-1" />
                  ) : (
                    <HiCheckCircle className="mr-1 h-4 w-4" />
                  )}
                  Confirm
                </Button>
              </Tooltip>
            )}
          {/* Edit button should always be available to add/change user-provided value */}
          {onEdit && (
            <Tooltip content="Edit your information">
              <Button
                color="light"
                size="xs"
                onClick={onEdit}
                disabled={isMutating}
                className="w-full justify-center"
              >
                <HiPencil className="mr-1 h-4 w-4" /> Edit
              </Button>
            </Tooltip>
          )}
        </div>
      )}
    </div>
  );
};
// --- End Demographic Info Display Component ---

const UserPreferencesPage: React.FC = () => {
  // --- Data Fetching (Keep existing) ---
  const {
    data: userProfile, // This should now contain the full User object including demographicData
    isLoading: profileLoading,
    error: profileError,
    refetch: refetchUserProfile, // Add refetch
  } = useUserProfile();
  // ... (rest of data fetching) ...
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

  // --- Mutations (Keep existing, ensure useUpdateUserProfile handles nested demographicData) ---
  const {
    mutate: updateProfile,
    isPending: isUpdatingProfile,
    error: updateProfileError,
  } = useUpdateUserProfile();
  // ... (rest of mutations) ...
  const {
    mutate: updatePreferences,
    isPending: isUpdatingPreferences,
    error: updatePreferencesError,
  } = useUpdateUserPreferences();

  // --- State (Keep existing) ---
  const [isEditingDemographics, setIsEditingDemographics] = useState(false);
  // ... (rest of state) ...
  const [showPreferenceModal, setShowPreferenceModal] = useState(false);
  const [editingPreferenceIndex, setEditingPreferenceIndex] = useState<
    number | null
  >(null);

  // --- Forms (Keep existing, Demographics form only targets user-provided fields) ---
  const {
    handleSubmit: handleDemoSubmit,
    reset: resetDemoForm,
    control: demoControl, // Use control for Controller
    formState: { isDirty: isDemoDirty, errors: demoErrors }, // Add errors
  } = useForm<DemographicsFormData>(); // Form data is only for user-provided fields

  // ... (Preference form remains the same) ...
  const {
    handleSubmit: handlePrefSubmit,
    reset: resetPrefForm,
    control: prefControl,
    watch: watchPref,
    formState: { errors: prefErrors },
  } = useForm<PreferenceFormData>({
    defaultValues: { category: "", attributes: {}, score: 50 },
  });

  // --- Effects (UPDATED demo form reset) ---
  useEffect(() => {
    // Reset the demographics form when the profile data loads or editing stops
    if (userProfile?.demographicData && !isEditingDemographics) {
      resetDemoForm({
        // Fields stored directly as user-provided in backend
        gender: userProfile.demographicData.gender || null,
        age: userProfile.demographicData.age || null,
        country: userProfile.demographicData.country || null,
        incomeBracket: userProfile.demographicData.incomeBracket || null,

        // Fields currently ONLY inferred/verified in backend - initialize form to null
        hasKids: null, // Or potentially pre-fill from inferred if desired, but form submits only the above 4
        relationshipStatus: null,
        employmentStatus: null,
        educationLevel: null,
      });
    } else if (!isEditingDemographics) {
      // If no profile data, reset all to null/defaults
      resetDemoForm({
        gender: null,
        age: null,
        country: null,
        incomeBracket: null,
        hasKids: null,
        relationshipStatus: null,
        employmentStatus: null,
        educationLevel: null,
      });
    }
  }, [userProfile, isEditingDemographics, resetDemoForm]);

  // ... (Preference form reset effect remains the same) ...
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
          // Assuming pref.attributes is Record<string, Record<string, number>>
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

  // --- Memos (Keep existing) ---
  const { categoryMap, attributeMap } = useMemo(() => {
    // ... (implementation remains the same) ...
    const catMap = new Map<string, TaxonomyCategory>();
    const attrMap = new Map<string, Map<string, string>>(); // categoryId -> Map<attrName, attrDescription>
    if (taxonomyData?.categories) {
      taxonomyData.categories.forEach((cat: TaxonomyCategory) => {
        catMap.set(cat.id, cat);
        const catAttrs = new Map<string, string>();
        cat.attributes?.forEach((attr: TaxonomyAttribute) => {
          catAttrs.set(attr.name, attr.description || attr.name);
        });
        // Include parent attributes (simple one-level for now)
        if (cat.parent_id) {
          const parentCat = taxonomyData.categories.find(
            (p: TaxonomyCategory) => p.id === cat.parent_id,
          );
          parentCat?.attributes?.forEach((attr: TaxonomyAttribute) => {
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

  // UPDATED: Demo Submit sends all user-provided fields
  const onDemoSubmit: SubmitHandler<DemographicsFormData> = (data) => {
    const payload: UserUpdate = {
      demographicData: {},
    };

    // Only include fields the backend schema accepts as user-provided
    payload.demographicData!.gender = data.gender || null;
    payload.demographicData!.age = data.age ? Number(data.age) : null;
    payload.demographicData!.country = data.country || null;
    payload.demographicData!.incomeBracket = data.incomeBracket || null;

    // DO NOT send hasKids, relationshipStatus etc. directly here
    // unless the backend schema (dbSchemas.js) and update logic (UserProfileService.js)
    // are modified to accept and store them as user-provided values.
    // Verification flags are handled by handleVerifyDemographic.

    // Only submit if there are actual changes
    if (isDemoDirty) {
      updateProfile(payload, {
        onSuccess: () => {
          setIsEditingDemographics(false); // Close form on success
          refetchUserProfile(); // Refetch to show updated data
        },
      });
    } else {
      setIsEditingDemographics(false); // Close form if no changes were made
    }
  };

  // NEW: Handler for verifying inferred data
  const handleVerifyDemographic = (fieldName: keyof DemographicData) => {
    const payload: UserUpdate = {
      demographicData: {
        [fieldName]: true, // Set the specific verification flag to true
      },
    };
    updateProfile(payload, {
      onSuccess: () => {
        refetchUserProfile(); // Refetch profile to show updated status
      },
      // Optional: Add onError handling
    });
  };

  // --- Preference Handlers (Keep existing) ---
  const onPrefSubmit: SubmitHandler<PreferenceFormData> = (data) => {
    // ... (implementation remains the same) ...
    const currentPreferences = preferencesData?.preferences || [];
    let updatedPreferences: PreferenceItem[];

    const apiAttributes: Record<string, { [key: string]: number }> = {};
    if (data.attributes) {
      Object.entries(data.attributes).forEach(([key, value]) => {
        if (value && value.trim() !== "") {
          apiAttributes[key] = { [value.trim()]: 1.0 };
        }
      });
    }

    const newPrefItem: PreferenceItem = {
      category: data.category,
      attributes: apiAttributes,
      score: data.score / 100,
    };

    if (editingPreferenceIndex !== null) {
      updatedPreferences = currentPreferences.map(
        (pref, index) =>
          index === editingPreferenceIndex ? newPrefItem : pref, // pref type is PreferenceItem
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
    // ... (implementation remains the same) ...
    const currentPreferences = preferencesData?.preferences || [];
    const updatedPreferences = currentPreferences.filter(
      (_: PreferenceItem, index: number) => index !== indexToRemove,
    );
    updatePreferences({ preferences: updatedPreferences });
  };

  const openAddModal = () => {
    // ... (implementation remains the same) ...
    setEditingPreferenceIndex(null);
    setShowPreferenceModal(true);
  };

  const openEditModal = (index: number) => {
    // ... (implementation remains the same) ...
    setEditingPreferenceIndex(index);
    setShowPreferenceModal(true);
  };

  // --- Render Logic ---
  const isLoading = profileLoading || preferencesLoading || taxonomyLoading;
  const error = profileError || preferencesError || taxonomyError;
  const isMutating = isUpdatingProfile || isUpdatingPreferences; // Combined mutation state

  if (isLoading && !userProfile) {
    // Show loading only if profile isn't loaded yet
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

  // Get demographic data safely
  const demographics = userProfile?.demographicData;

  return (
    <div className="container mx-auto px-4 py-12">
      <h2 className="mb-8 text-3xl font-bold text-gray-900 dark:text-white">
        Manage Your Profile & Interests
      </h2>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* --- Demographics Section (UPDATED) --- */}
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center text-xl font-semibold text-gray-900 dark:text-white">
              <HiUser className="mr-2 h-5 w-5" />
              About You
            </h3>
            {/* Edit button is now handled within DemoInfoDisplay */}
          </div>
          {updateProfileError && (
            <Alert color="failure" icon={HiInformationCircle} className="mt-4">
              Failed to update profile: {updateProfileError.message}
            </Alert>
          )}
          {isEditingDemographics ? (
            // --- EDIT FORM (Only User-Provided Fields) ---
            <form
              onSubmit={handleDemoSubmit(onDemoSubmit)}
              className="mt-4 space-y-4"
            >
              {/* Gender */}
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Controller
                  name="gender"
                  control={demoControl}
                  render={({ field }) => (
                    <Select
                      id="gender"
                      {...field}
                      value={field.value ?? ""} // Handle null/undefined
                      className="mt-1"
                    >
                      {genderOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  )}
                />
              </div>
              {/* Age */}
              <div>
                <Label htmlFor="age">Age</Label>
                <Controller
                  name="age"
                  control={demoControl}
                  render={({ field }) => (
                    <TextInput
                      id="age"
                      type="number"
                      placeholder="e.g., 30"
                      min="0"
                      {...field}
                      value={field.value ?? ""} // Handle null/undefined for input value
                      onChange={(e) =>
                        field.onChange(
                          e.target.value === ""
                            ? null
                            : parseInt(e.target.value, 10),
                        )
                      } // Convert back to number or null
                      className="mt-1"
                    />
                  )}
                />
                {demoErrors.age && (
                  <p className="mt-1 text-sm text-red-600">
                    {demoErrors.age.message}
                  </p>
                )}
              </div>
              {/* Country */}
              <div>
                <Label htmlFor="country">Country</Label>
                <Controller
                  name="country"
                  control={demoControl}
                  render={({ field }) => (
                    <Select
                      id="country"
                      {...field}
                      value={field.value ?? ""} // Handle null/undefined
                      className="mt-1"
                    >
                      {countryOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  )}
                />
              </div>
              {/* Income Bracket */}
              <div>
                <Label htmlFor="incomeBracket">Income Bracket</Label>
                <Controller
                  name="incomeBracket"
                  control={demoControl}
                  render={({ field }) => (
                    <Select
                      id="incomeBracket"
                      {...field}
                      value={field.value ?? ""} // Handle null/undefined
                      className="mt-1"
                    >
                      {incomeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  )}
                />
              </div>

              {/* --- NEW Form Fields for Previously Inferred Data --- */}

              {/* Has Kids */}
              <div>
                <Label htmlFor="hasKids">Do you have kids?</Label>
                <Controller
                  name="hasKids"
                  control={demoControl}
                  render={({ field }) => (
                    <Select
                      id="hasKids"
                      {...field}
                      // Convert boolean/null to string for select value
                      value={
                        field.value === true
                          ? "true"
                          : field.value === false
                            ? "false"
                            : ""
                      }
                      onChange={(e) => {
                        // Convert string back to boolean or null
                        const value = e.target.value;
                        field.onChange(
                          value === "true"
                            ? true
                            : value === "false"
                              ? false
                              : null,
                        );
                      }}
                      className="mt-1"
                    >
                      {hasKidsOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  )}
                />
              </div>

              {/* Relationship Status */}
              <div>
                <Label htmlFor="relationshipStatus">Relationship Status</Label>
                <Controller
                  name="relationshipStatus"
                  control={demoControl}
                  render={({ field }) => (
                    <Select
                      id="relationshipStatus"
                      {...field}
                      value={field.value ?? ""}
                      className="mt-1"
                    >
                      {relationshipStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  )}
                />
              </div>

              {/* Employment Status */}
              <div>
                <Label htmlFor="employmentStatus">Employment Status</Label>
                <Controller
                  name="employmentStatus"
                  control={demoControl}
                  render={({ field }) => (
                    <Select
                      id="employmentStatus"
                      {...field}
                      value={field.value ?? ""}
                      className="mt-1"
                    >
                      {employmentStatusOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  )}
                />
              </div>

              {/* Education Level */}
              <div>
                <Label htmlFor="educationLevel">Education Level</Label>
                <Controller
                  name="educationLevel"
                  control={demoControl}
                  render={({ field }) => (
                    <Select
                      id="educationLevel"
                      {...field}
                      value={field.value ?? ""}
                      className="mt-1"
                    >
                      {educationLevelOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </Select>
                  )}
                />
              </div>
              {/* --- End NEW Form Fields --- */}

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-2">
                <Button
                  color="gray"
                  onClick={() => setIsEditingDemographics(false)}
                  disabled={isMutating}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isMutating || !isDemoDirty} // Disable if mutating or no changes
                >
                  {isUpdatingProfile ? (
                    <>
                      <Spinner size="sm" className="mr-3" /> Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          ) : (
            // --- DISPLAY VIEW (User-Provided + Inferred) ---
            <div className="mt-4 space-y-3">
              {/* Gender */}
              <DemoInfoDisplay
                icon={HiOutlineIdentification}
                label="Gender"
                userProvidedValue={demographics?.gender} // Correct
                inferredValue={demographics?.inferredGender}
                isVerified={demographics?.genderIsVerified}
                verificationFieldName="genderIsVerified"
                onVerify={handleVerifyDemographic}
                onEdit={() => setIsEditingDemographics(true)}
                isLoading={profileLoading && !demographics}
                isMutating={isUpdatingProfile}
                isEditingDemographics={isEditingDemographics}
              />
              {/* Age */}
              <DemoInfoDisplay
                icon={HiOutlineCalendar}
                label="Age"
                userProvidedValue={demographics?.age} // Correct
                inferredValue={demographics?.inferredAgeBracket} // Still show inferred bracket if age not set
                isVerified={demographics?.ageBracketIsVerified} // Verification applies to bracket
                verificationFieldName="ageBracketIsVerified"
                onVerify={handleVerifyDemographic}
                onEdit={() => setIsEditingDemographics(true)}
                isLoading={profileLoading && !demographics}
                isMutating={isUpdatingProfile}
                isEditingDemographics={isEditingDemographics}
              />
              {/* Country */}
              <DemoInfoDisplay
                icon={HiOutlineGlobeAlt}
                label="Country"
                userProvidedValue={demographics?.country} // Correct
                // No inferred value for country
                onEdit={() => setIsEditingDemographics(true)}
                isLoading={profileLoading && !demographics}
                isMutating={isUpdatingProfile}
                isEditingDemographics={isEditingDemographics}
              />
              {/* Income */}
              <DemoInfoDisplay
                icon={HiOutlineCurrencyDollar}
                label="Income Bracket"
                userProvidedValue={demographics?.incomeBracket} // Correct
                // No inferred value for income
                onEdit={() => setIsEditingDemographics(true)}
                isLoading={profileLoading && !demographics}
                isMutating={isUpdatingProfile}
                isEditingDemographics={isEditingDemographics}
              />
              {/* Has Kids */}
              <DemoInfoDisplay
                icon={HiOutlineUserGroup}
                label="Has Kids"
                userProvidedValue={null} // No direct user-provided field in current backend schema
                inferredValue={demographics?.inferredHasKids}
                isVerified={demographics?.hasKidsIsVerified}
                verificationFieldName="hasKidsIsVerified"
                onVerify={handleVerifyDemographic}
                onEdit={() => setIsEditingDemographics(true)} // Allow editing (form collects input, but submit might ignore it)
                isLoading={profileLoading && !demographics}
                isMutating={isUpdatingProfile}
                isEditingDemographics={isEditingDemographics}
              />
              {/* Relationship Status */}
              <DemoInfoDisplay
                icon={HiOutlineUsers}
                label="Relationship Status"
                userProvidedValue={null} // No direct user-provided field
                inferredValue={demographics?.inferredRelationshipStatus}
                isVerified={demographics?.relationshipStatusIsVerified}
                verificationFieldName="relationshipStatusIsVerified"
                onVerify={handleVerifyDemographic}
                onEdit={() => setIsEditingDemographics(true)} // Allow editing
                isLoading={profileLoading && !demographics}
                isMutating={isUpdatingProfile}
                isEditingDemographics={isEditingDemographics}
              />
              {/* Employment Status */}
              <DemoInfoDisplay
                icon={HiOutlineBriefcase}
                label="Employment Status"
                userProvidedValue={null} // No direct user-provided field
                inferredValue={demographics?.inferredEmploymentStatus}
                isVerified={demographics?.employmentStatusIsVerified}
                verificationFieldName="employmentStatusIsVerified"
                onVerify={handleVerifyDemographic}
                onEdit={() => setIsEditingDemographics(true)} // Allow editing
                isLoading={profileLoading && !demographics}
                isMutating={isUpdatingProfile}
                isEditingDemographics={isEditingDemographics}
              />
              {/* Education Level */}
              <DemoInfoDisplay
                icon={HiOutlineAcademicCap}
                label="Education Level"
                userProvidedValue={null} // No direct user-provided field
                inferredValue={demographics?.inferredEducationLevel}
                isVerified={demographics?.educationLevelIsVerified}
                verificationFieldName="educationLevelIsVerified"
                onVerify={handleVerifyDemographic}
                onEdit={() => setIsEditingDemographics(true)} // Allow editing
                isLoading={profileLoading && !demographics}
                isMutating={isUpdatingProfile}
                isEditingDemographics={isEditingDemographics}
              />
            </div>
          )}
        </Card>

        {/* --- Preferences Section (Right Columns on Large Screens) --- */}
        <Card className="lg:col-span-2">
          {/* ... (Preference list and modal rendering remains the same) ... */}
          <div className="flex items-center justify-between">
            <h3 className="flex items-center text-xl font-semibold text-gray-900 dark:text-white">
              <HiOutlineHeart className="mr-2 h-5 w-5" /> {/* Example Icon */}
              Your Interests
            </h3>
            <Button
              color="success"
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
          {preferencesLoading ? (
            <div className="flex justify-center py-6">
              <Spinner size="md" />
            </div>
          ) : preferencesData?.preferences &&
            preferencesData.preferences.length > 0 ? (
            <List
              unstyled
              className="mt-4 divide-y divide-gray-200 dark:divide-gray-700"
            >
              {preferencesData.preferences.map((pref, index) => (
                <ListItem key={index} className="py-3 sm:py-4">
                  {" "}
                  {/* pref type is PreferenceItem */}
                  <div className="flex items-center space-x-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {categoryMap.get(pref.category)?.name || pref.category}
                      </p>
                      {/* Check if attributes is a non-null object before processing */}
                      {pref.attributes &&
                        typeof pref.attributes === "object" &&
                        Object.keys(pref.attributes).length > 0 && (
                          <p className="truncate text-sm text-gray-500 dark:text-gray-400">
                            {Object.entries(pref.attributes)
                              .map(([key, valueObj]) => {
                                // Ensure valueObj is also an object before getting keys
                                if (
                                  typeof valueObj === "object" &&
                                  valueObj !== null
                                ) {
                                  const value = Object.keys(valueObj)[0]; // Get the first key (value)
                                  return `${key}: ${value}`;
                                }
                                return `${key}: N/A`; // Fallback if valueObj is not as expected
                              })
                              .join(", ")}
                          </p>
                        )}
                    </div>
                    <div className="inline-flex items-center text-base font-semibold text-gray-900 dark:text-white">
                      {/* Display score as percentage */}
                      {pref.score !== null && pref.score !== undefined
                        ? `${Math.round(pref.score * 100)}%`
                        : "N/A"}
                    </div>
                    <div className="flex space-x-2">
                      <Tooltip content="Edit this interest">
                        <Button
                          color="light"
                          size="xs"
                          onClick={() => openEditModal(index)}
                          disabled={isMutating}
                        >
                          <HiPencil className="h-4 w-4" />
                        </Button>
                      </Tooltip>
                      <Tooltip content="Remove this interest">
                        <Button
                          color="failure"
                          size="xs"
                          onClick={() => handleRemovePreference(index)}
                          disabled={isMutating}
                        >
                          <HiTrash className="h-4 w-4" /> {/* Example Icon */}
                        </Button>
                      </Tooltip>
                    </div>
                  </div>
                </ListItem>
              ))}
            </List>
          ) : (
            <p className="mt-4 text-center text-gray-500 dark:text-gray-400">
              You haven't added any specific interests yet. Add some to help
              personalize your experience!
            </p>
          )}
        </Card>
      </div>

      {/* --- Preference Edit/Add Modal --- */}
      <Modal
        show={showPreferenceModal}
        onClose={() => setShowPreferenceModal(false)}
      >
        <ModalHeader>
          {editingPreferenceIndex !== null ? "Edit Interest" : "Add Interest"}
        </ModalHeader>
        <ModalBody>
          <form
            id="preference-form"
            onSubmit={handlePrefSubmit(onPrefSubmit)}
            className="space-y-4"
          >
            {/* Category Select */}
            <div>
              <Label htmlFor="category">Category *</Label>
              <Controller
                name="category"
                control={prefControl}
                rules={{ required: "Category is required" }}
                render={({ field }) => (
                  <Select id="category" {...field} className="mt-1">
                    <option value="">Select a Category</option>
                    {taxonomyData?.categories
                      ?.sort((a: TaxonomyCategory, b: TaxonomyCategory) =>
                        a.name.localeCompare(b.name),
                      ) // Sort categories alphabetically
                      .map(
                        (
                          cat: TaxonomyCategory, // cat type is TaxonomyCategory
                        ) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ),
                      )}
                  </Select>
                )}
              />
              {prefErrors.category && (
                <p className="mt-1 text-sm text-red-600">
                  {prefErrors.category.message}
                </p>
              )}
            </div>

            {/* Dynamic Attributes */}
            {selectedCategoryId && availableAttributes.size > 0 && (
              <Card>
                {" "}
                {/* Wrap attributes in a card for better visual grouping */}
                <h4 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Refine by Attributes (Optional)
                </h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {Array.from(availableAttributes.entries()).map(
                    ([attrName, attrDesc]) => (
                      <div key={attrName}>
                        <Label htmlFor={`attr-${attrName}`} className="text-xs">
                          {attrDesc || attrName}
                        </Label>
                        <Controller
                          name={`attributes.${attrName}`}
                          control={prefControl}
                          render={({ field }) => (
                            <TextInput
                              id={`attr-${attrName}`}
                              placeholder={`e.g., Blue, Large, Apple`} // Provide example
                              {...field}
                              value={field.value || ""} // Ensure controlled component
                              className="mt-1"
                            />
                          )}
                        />
                      </div>
                    ),
                  )}
                </div>
              </Card>
            )}

            {/* Score Slider */}
            <div>
              <Label htmlFor="score">{`Interest Score: ${watchPref("score")}%`}</Label>
              <Controller
                name="score"
                control={prefControl}
                render={({ field }) => (
                  <RangeSlider
                    id="score"
                    min={0}
                    max={100}
                    step={5}
                    {...field}
                    className="mt-1"
                  />
                )}
              />
            </div>
          </form>
          {updatePreferencesError && (
            <Alert color="failure" icon={HiInformationCircle} className="mt-2">
              Failed to save interest: {updatePreferencesError.message}
            </Alert>
          )}
        </ModalBody>
        <ModalFooter>
          <Button
            color="gray"
            onClick={() => setShowPreferenceModal(false)}
            disabled={isUpdatingPreferences}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form="preference-form" // Link button to the form
            disabled={isUpdatingPreferences}
          >
            {isUpdatingPreferences ? (
              <>
                <Spinner size="sm" className="mr-3" /> Saving...
              </>
            ) : editingPreferenceIndex !== null ? (
              "Save Changes"
            ) : (
              "Add Interest"
            )}
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

export default UserPreferencesPage;
