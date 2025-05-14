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
} from "flowbite-react";
import {
  HiUser,
  HiOutlineUserCircle,
  HiOutlineCake,
  HiOutlineGlobeAlt,
  HiOutlineCash,
  HiOutlineAcademicCap, // <-- Icon for education
  HiOutlineBriefcase, // <-- Icon for employment
  HiOutlineUsers, // <-- Icon for relationship
  HiOutlineHeart, // <-- Icon for hasKids
  HiInformationCircle,
  HiSparkles,
  HiPlus,
  HiPencil,
  HiTrash,
  HiCheck,
  HiX,
} from "react-icons/hi"; // <-- Add new icons
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { useEffect, useState, useMemo } from "react";
import {
  useUserProfile,
  useUserPreferences,
  useUpdateUserProfile,
  useUpdateUserPreferences,
} from "../../api/hooks/useUserHooks"; // <-- Corrected import path
import { useTaxonomy } from "../../api/hooks/useTaxonomyHooks"; // <-- Corrected import path
import {
  UserUpdate,
  PreferenceItem,
  TaxonomyCategory,
  DemographicData, // <-- Import DemographicData type
} from "../../api/types/data-contracts";
import LoadingSpinner from "../../components/common/LoadingSpinner";
import ErrorDisplay from "../../components/common/ErrorDisplay";
import countryData from "../../data/countries.json";

// --- Form Types ---
// Update to include all user-editable demographic fields
type DemographicsFormData = Pick<
  DemographicData, // Use DemographicData type directly
  | "gender"
  | "age"
  | "country"
  | "incomeBracket"
  | "hasKids"
  | "relationshipStatus"
  | "employmentStatus"
  | "educationLevel"
>;
type PreferenceFormData = {
  category: string;
  score: number;
  attributes?: Record<string, string | undefined>;
};

// --- Define options for selects ---
const genderOptions = [
  { value: "", label: "Select Gender" },
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "non-binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const incomeOptions = [
  { value: "", label: "Select Income Bracket" }, // Make placeholder less optional here
  { value: "<25k", label: "< $25,000" },
  { value: "25k-50k", label: "$25,000 - $49,999" },
  { value: "50k-100k", label: "$50,000 - $99,999" },
  { value: "100k-200k", label: "$100,000 - $199,999" },
  { value: ">200k", label: "> $200,000" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

// --- NEW Options ---
const relationshipOptions = [
  { value: "", label: "Select Relationship Status" },
  { value: "single", label: "Single" },
  { value: "relationship", label: "In a relationship" },
  { value: "married", label: "Married" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const employmentOptions = [
  { value: "", label: "Select Employment Status" },
  { value: "employed", label: "Employed" },
  { value: "unemployed", label: "Unemployed" },
  { value: "student", label: "Student" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];

const educationOptions = [
  { value: "", label: "Select Education Level" },
  { value: "high_school", label: "High School" },
  { value: "bachelors", label: "Bachelor's Degree" },
  { value: "masters", label: "Master's Degree" },
  { value: "doctorate", label: "Doctorate" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];
// --- End NEW Options ---

// --- Has Kids Options ---
const hasKidsOptions = [
  { value: "", label: "Select an option" }, // Default/unset option
  { value: "true", label: "Yes" },
  { value: "false", label: "No" },
  { value: "prefer_not_to_say", label: "Prefer not to say" }, // Represented by null in the data
];
// --- End Has Kids Options ---

// --- Country Options (copied from UserRegistrationForm) ---
interface CountryOption {
  value: string;
  label: string;
}
const typedCountryData: CountryOption[] = Object.entries(countryData).map(
  ([code, name]) => ({ value: code, label: name }),
);
typedCountryData.sort((a, b) => a.label.localeCompare(b.label));
const countryOptions: CountryOption[] = [
  { value: "", label: "Select Country" }, // Make placeholder less optional here
  ...typedCountryData,
];
// --- End Country Options ---

// --- Mini Demographic Card Component ---
// filepath: /Users/cdevmina/Projects/Tapiro/web/src/pages/UserDashboard/UserPreferencesPage.tsx
interface DemoInfoCardProps {
  icon: React.ElementType;
  label: string;
  value: string | number | null | undefined;
  isLoading?: boolean;
  isInferred?: boolean; // Added: Flag for inferred data
  fieldName?: keyof DemographicsFormData; // Added: Field name for verification
  onVerify?: (
    fieldName: keyof DemographicsFormData,
    // --- CHANGE HERE ---
    valueToVerify: string | number | boolean | null | undefined,
  ) => void; // Added: Handler for verify button
}

const DemoInfoCard: React.FC<DemoInfoCardProps> = ({
  icon: Icon,
  label,
  value,
  isLoading,
  isInferred, // Destructure
  fieldName, // Destructure
  onVerify, // Destructure
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
        <div className="flex items-center">
          {" "}
          {/* Wrap value and button */}
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {value || "Not set"}
            {isInferred &&
              value && ( // Show "(inferred)" text
                <span className="ml-1 text-xs font-normal text-gray-500 dark:text-gray-400">
                  (inferred)
                </span>
              )}
          </p>
          {/* Show Verify button if inferred, has value, not loading, and handler provided */}
          {isInferred && value && !isLoading && fieldName && onVerify && (
            <Button
              size="xs"
              color="light"
              className="ml-2 px-2 py-1" // Adjusted padding for smaller button
              onClick={() => onVerify(fieldName, value)} // Call handler with fieldName and current value
            >
              Verify
            </Button>
          )}
        </div>
      )}
    </div>
  </div>
);
// --- End Mini Demographic Card Component ---

const UserPreferencesPage: React.FC = () => {
  // --- Data Fetching (Keep existing) ---
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

  // --- Mutations (Keep existing) ---
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

  // --- State (Keep existing) ---
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
    setValue: setValueDemo, // <-- Get setValue for verification
    formState: { isDirty: isDemoDirty, errors: demoErrors }, // <-- Add errors
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

  // Update useEffect to reset ALL demographic fields when NOT editing
  useEffect(() => {
    if (userProfile?.demographicData && !isEditingDemographics) {
      resetDemoForm({
        gender: userProfile.demographicData.gender ?? null, // Use ?? null
        age: userProfile.demographicData.age ?? undefined, // Use ?? for null/undefined
        country: userProfile.demographicData.country ?? null, // Use ?? null
        incomeBracket: userProfile.demographicData.incomeBracket ?? null, // Use ?? null
        hasKids: userProfile.demographicData.hasKids ?? null, // Default to null
        relationshipStatus:
          userProfile.demographicData.relationshipStatus ?? null, // Use ?? null
        employmentStatus: userProfile.demographicData.employmentStatus ?? null, // Use ?? null
        educationLevel: userProfile.demographicData.educationLevel ?? null, // Use ?? null
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
            // Attempt to get the first key if it's an object like { "Blue": 1.0 }
            let displayValue: string | undefined = undefined;
            if (typeof valueObj === "object" && valueObj !== null) {
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
  // Update onDemoSubmit to handle all fields and nest payload
  const onDemoSubmit: SubmitHandler<DemographicsFormData> = (data) => {
    // Construct the nested demographicData payload
    const demoPayload: Partial<DemographicData> = {};

    // Handle each field, setting to null if empty/default
    demoPayload.gender = data.gender ? data.gender : null;
    demoPayload.age =
      data.age !== undefined && data.age !== null && !isNaN(data.age)
        ? Number(data.age)
        : null;
    demoPayload.country = data.country ? data.country : null;
    demoPayload.incomeBracket = data.incomeBracket ? data.incomeBracket : null;
    // Handle boolean (null is allowed)
    // Ensure undefined from form becomes null for API
    demoPayload.hasKids = data.hasKids === undefined ? null : data.hasKids;
    demoPayload.relationshipStatus = data.relationshipStatus
      ? data.relationshipStatus
      : null;
    demoPayload.employmentStatus = data.employmentStatus
      ? data.employmentStatus
      : null;
    demoPayload.educationLevel = data.educationLevel
      ? data.educationLevel
      : null;

    // Construct the final UserUpdate payload
    const finalPayload: UserUpdate = {
      demographicData: demoPayload,
    };

    console.log("Submitting demographic update:", finalPayload); // Debug log

    // Only submit if the form is dirty (React Hook Form tracks this)
    if (isDemoDirty) {
      updateProfile(finalPayload, {
        onSuccess: () => setIsEditingDemographics(false),
        onError: (err) => {
          console.error("Profile update failed:", err); // Log error
        },
      });
    } else {
      // No changes detected, just exit edit mode
      setIsEditingDemographics(false);
    }
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
    const filteredPreferences = currentPreferences.filter(
      (_, index) => index !== indexToRemove,
    );

    const sanitizedPreferences = filteredPreferences.map((pref) => {
      const newScore =
        pref.score === null || pref.score === undefined ? 0.5 : pref.score;
      const newAttributes =
        pref.attributes === null || pref.attributes === undefined
          ? {}
          : pref.attributes;

      return {
        ...pref,
        score: newScore,
        attributes: newAttributes,
      };
    });

    updatePreferences({ preferences: sanitizedPreferences });
  };

  const openAddModal = () => {
    setEditingPreferenceIndex(null);
    setShowPreferenceModal(true);
  };

  const openEditModal = (index: number) => {
    setEditingPreferenceIndex(index);
    setShowPreferenceModal(true);
  };
  const handleVerify = (
    fieldName: keyof DemographicsFormData,
    // --- CHANGE HERE ---
    valueToVerify: string | number | boolean | null | undefined,
  ) => {
    setIsEditingDemographics(true);
    // Use timeout to ensure state update completes before setting value
    setTimeout(() => {
      // Convert boolean "Yes"/"No" back to boolean for ToggleSwitch
      // --- FIX: Handle potential undefined from valueToVerify ---
      let formValue: string | number | boolean | null = valueToVerify ?? null;

      // Find the corresponding value for enum fields OR hasKids
      if (fieldName === "hasKids") {
        // Find the option matching the display label
        const option = hasKidsOptions.find((o) => o.label === valueToVerify);
        // Convert the option's string value back to boolean/null
        formValue =
          option?.value === "true"
            ? true
            : option?.value === "false"
              ? false
              : null;
      } else if (fieldName === "gender")
        formValue =
          genderOptions.find((o) => o.label === valueToVerify)?.value ?? null;
      else if (fieldName === "country")
        formValue =
          countryOptions.find((o) => o.label === valueToVerify)?.value ?? null;
      else if (fieldName === "incomeBracket")
        formValue =
          incomeOptions.find((o) => o.label === valueToVerify)?.value ?? null;
      else if (fieldName === "relationshipStatus")
        formValue =
          relationshipOptions.find((o) => o.label === valueToVerify)?.value ??
          null;
      else if (fieldName === "employmentStatus")
        formValue =
          employmentOptions.find((o) => o.label === valueToVerify)?.value ??
          null;
      else if (fieldName === "educationLevel")
        formValue =
          educationOptions.find((o) => o.label === valueToVerify)?.value ??
          null;
      // Ensure age is treated as a number or null for the form
      else if (fieldName === "age") {
        // Use valueToVerify here as formValue might already be null
        formValue = typeof valueToVerify === "number" ? valueToVerify : null;
      }

      // Use setValueDemo with the potentially transformed formValue
      setValueDemo(fieldName, formValue, { shouldDirty: true });

      // Optional: Focus the element after setting value
      const element = document.getElementById(fieldName);
      element?.focus();
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 0);
    console.log(`Verifying ${fieldName} with value:`, valueToVerify);
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

  // Helper to format boolean/null
  const formatBoolean = (value: boolean | null | undefined): string => {
    if (value === true) return "Yes";
    if (value === false) return "No";
    return "Not set";
  };

  // Helper to format enum values
  const formatEnum = (
    value: string | null | undefined,
    options: { value: string; label: string }[],
  ): string => {
    const found = options.find((opt) => opt.value === value);
    return found?.label || value || "Not set";
  };

  return (
    <div className="container mx-auto px-4 py-12">
      <h2 className="mb-8 text-3xl font-bold text-gray-900 dark:text-white">
        Manage Your Profile & Interests
      </h2>

      {/* wrap both cards in a grid */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
        {/* --- Demographics Section (Left) */}
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between">
            <h3 className="flex items-center text-xl font-semibold text-gray-900 dark:text-white">
              <HiUser className="mr-2 h-5 w-5" />
              About You
            </h3>
            {!isEditingDemographics && (
              <Button
                color="gray"
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
            // --- EDIT FORM ---
            <form
              onSubmit={handleDemoSubmit(onDemoSubmit)}
              className="mt-4 space-y-4"
            >
              {/* Gender */}
              <div>
                <Label htmlFor="gender">Gender</Label>
                <Select id="gender" {...registerDemo("gender")}>
                  {genderOptions.map((option) => (
                    <option key={option.value} value={option.value ?? ""}>
                      {" "}
                      {/* Ensure value is not null/undefined */}
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              {/* Age */}
              <div>
                <Label htmlFor="age">Age</Label>
                <TextInput
                  id="age"
                  type="number"
                  placeholder="Enter your age"
                  {...registerDemo("age", {
                    valueAsNumber: true, // Keep this if API expects number
                    min: { value: 0, message: "Age cannot be negative" },
                    validate: (value) =>
                      value === null ||
                      value === undefined ||
                      !isNaN(value) ||
                      "Invalid age", // Allow null/undefined
                  })}
                />
                {demoErrors.age && (
                  <p className="mt-1 text-xs text-red-600">
                    {demoErrors.age.message}
                  </p>
                )}
              </div>
              {/* Country */}
              <div>
                <Label htmlFor="country">Country</Label>
                <Select id="country" {...registerDemo("country")}>
                  {countryOptions.map((option) => (
                    <option key={option.value} value={option.value ?? ""}>
                      {" "}
                      {/* Ensure value is not null/undefined */}
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              {/* Income Bracket */}
              <div>
                <Label htmlFor="incomeBracket">Income Bracket</Label>
                <Select id="incomeBracket" {...registerDemo("incomeBracket")}>
                  {incomeOptions.map((option) => (
                    <option key={option.value} value={option.value ?? ""}>
                      {" "}
                      {/* Ensure value is not null/undefined */}
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              {/* Has Kids - Changed to Select */}
              <div>
                <Label htmlFor="hasKids">Do you have children?</Label>
                <Select
                  id="hasKids"
                  {...registerDemo("hasKids", {
                    // Convert string "true"/"false" back to boolean, handle ""/"prefer_not_to_say" as null
                    setValueAs: (value) => {
                      if (value === "true") return true;
                      if (value === "false") return false;
                      return null; // Treat "" and "prefer_not_to_say" as null
                    },
                  })}
                >
                  {hasKidsOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              {/* Relationship Status */}
              <div>
                <Label htmlFor="relationshipStatus">Relationship Status</Label>
                <Select
                  id="relationshipStatus"
                  {...registerDemo("relationshipStatus")}
                >
                  {relationshipOptions.map((option) => (
                    <option key={option.value} value={option.value ?? ""}>
                      {" "}
                      {/* Ensure value is not null/undefined */}
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              {/* Employment Status */}
              <div>
                <Label htmlFor="employmentStatus">Employment Status</Label>
                <Select
                  id="employmentStatus"
                  {...registerDemo("employmentStatus")}
                >
                  {employmentOptions.map((option) => (
                    <option key={option.value} value={option.value ?? ""}>
                      {" "}
                      {/* Ensure value is not null/undefined */}
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>
              {/* Education Level */}
              <div>
                <Label htmlFor="educationLevel">Education Level</Label>
                <Select id="educationLevel" {...registerDemo("educationLevel")}>
                  {educationOptions.map((option) => (
                    <option key={option.value} value={option.value ?? ""}>
                      {" "}
                      {/* Ensure value is not null/undefined */}
                      {option.label}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-2">
                <Button
                  color="gray"
                  onClick={() => {
                    setIsEditingDemographics(false);
                    resetDemoForm();
                  }}
                  disabled={isMutating}
                >
                  <HiX className="mr-1 h-4 w-4" /> Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isUpdatingProfile || !isDemoDirty}
                >
                  {isUpdatingProfile ? (
                    <>
                      <Spinner size="sm" className="mr-2" /> Saving...
                    </>
                  ) : (
                    <>
                      <HiCheck className="mr-1 h-4 w-4" /> Save Changes
                    </>
                  )}
                </Button>
              </div>
            </form>
          ) : (
            // --- DISPLAY VIEW (Combined User-Provided and Inferred) ---
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {/* User Provided or Verified */}
              <DemoInfoCard
                icon={HiOutlineUserCircle}
                label="Gender"
                value={formatEnum(
                  userProfile?.demographicData?.gender,
                  genderOptions,
                )}
                isLoading={profileLoading}
                // If user provided is null, show inferred with verify button
                isInferred={
                  !userProfile?.demographicData?.gender &&
                  !!userProfile?.demographicData?.inferredGender
                }
                fieldName="gender"
                onVerify={handleVerify}
              />
              <DemoInfoCard
                icon={HiOutlineCake}
                label="Age"
                value={userProfile?.demographicData?.age} // Age is number, no enum formatting
                isLoading={profileLoading}
                // No inferred age currently, so no verify needed here
              />
              <DemoInfoCard
                icon={HiOutlineGlobeAlt}
                label="Country"
                value={formatEnum(
                  userProfile?.demographicData?.country,
                  countryOptions,
                )}
                isLoading={profileLoading}
                // No inferred country currently
              />
              <DemoInfoCard
                icon={HiOutlineCash}
                label="Income"
                value={formatEnum(
                  userProfile?.demographicData?.incomeBracket,
                  incomeOptions,
                )}
                isLoading={profileLoading}
                // No inferred income currently
              />
              <DemoInfoCard
                icon={HiOutlineHeart}
                label="Has Children"
                // Use formatEnum with hasKidsOptions (convert boolean/null to string value first)
                value={formatEnum(
                  userProfile?.demographicData?.hasKids === true
                    ? "true"
                    : userProfile?.demographicData?.hasKids === false
                      ? "false"
                      : userProfile?.demographicData?.hasKids === null &&
                          userProfile?.demographicData?.relationshipStatus ===
                            "prefer_not_to_say" // Check if explicitly 'prefer_not_to_say' was saved
                        ? "prefer_not_to_say" // Map null back to prefer_not_to_say if appropriate (might need adjustment based on API save logic)
                        : "", // Default to empty string for "Not set" or other null cases
                  hasKidsOptions,
                )}
                isLoading={profileLoading}
                // Show inferred if user provided is null (and not explicitly 'prefer_not_to_say')
                isInferred={
                  userProfile?.demographicData?.hasKids === null &&
                  userProfile?.demographicData?.inferredHasKids !== null &&
                  userProfile?.demographicData?.relationshipStatus !==
                    "prefer_not_to_say" // Don't show inferred if user chose 'prefer not to say'
                }
                fieldName="hasKids"
                onVerify={handleVerify}
              />
              <DemoInfoCard
                icon={HiOutlineUsers}
                label="Relationship"
                value={formatEnum(
                  userProfile?.demographicData?.relationshipStatus,
                  relationshipOptions,
                )}
                isLoading={profileLoading}
                // Show inferred if user provided is null
                isInferred={
                  !userProfile?.demographicData?.relationshipStatus &&
                  !!userProfile?.demographicData?.inferredRelationshipStatus
                }
                fieldName="relationshipStatus"
                onVerify={handleVerify}
              />
              <DemoInfoCard
                icon={HiOutlineBriefcase}
                label="Employment"
                value={formatEnum(
                  userProfile?.demographicData?.employmentStatus,
                  employmentOptions,
                )}
                isLoading={profileLoading}
                // Show inferred if user provided is null
                isInferred={
                  !userProfile?.demographicData?.employmentStatus &&
                  !!userProfile?.demographicData?.inferredEmploymentStatus
                }
                fieldName="employmentStatus"
                onVerify={handleVerify}
              />
              <DemoInfoCard
                icon={HiOutlineAcademicCap}
                label="Education"
                value={formatEnum(
                  userProfile?.demographicData?.educationLevel,
                  educationOptions,
                )}
                isLoading={profileLoading}
                // Show inferred if user provided is null
                isInferred={
                  !userProfile?.demographicData?.educationLevel &&
                  !!userProfile?.demographicData?.inferredEducationLevel
                }
                fieldName="educationLevel"
                onVerify={handleVerify}
              />

              {/* Display inferred values ONLY if user hasn't provided one */}
              {!userProfile?.demographicData?.gender &&
                userProfile?.demographicData?.inferredGender && (
                  <DemoInfoCard
                    icon={HiOutlineUserCircle}
                    label="Gender" // Re-use label, it will show (inferred)
                    value={formatEnum(
                      userProfile?.demographicData?.inferredGender,
                      genderOptions,
                    )}
                    isLoading={profileLoading}
                    isInferred={true}
                    fieldName="gender"
                    onVerify={handleVerify}
                  />
                )}
              {!userProfile?.demographicData?.hasKids &&
                userProfile?.demographicData?.inferredHasKids !== null && (
                  <DemoInfoCard
                    icon={HiOutlineHeart}
                    label="Has Children"
                    value={formatBoolean(
                      userProfile?.demographicData?.inferredHasKids,
                    )}
                    isLoading={profileLoading}
                    isInferred={true}
                    fieldName="hasKids"
                    onVerify={handleVerify}
                  />
                )}
              {!userProfile?.demographicData?.relationshipStatus &&
                userProfile?.demographicData?.inferredRelationshipStatus && (
                  <DemoInfoCard
                    icon={HiOutlineUsers}
                    label="Relationship"
                    value={formatEnum(
                      userProfile?.demographicData?.inferredRelationshipStatus,
                      relationshipOptions,
                    )}
                    isLoading={profileLoading}
                    isInferred={true}
                    fieldName="relationshipStatus"
                    onVerify={handleVerify}
                  />
                )}
              {!userProfile?.demographicData?.employmentStatus &&
                userProfile?.demographicData?.inferredEmploymentStatus && (
                  <DemoInfoCard
                    icon={HiOutlineBriefcase}
                    label="Employment"
                    value={formatEnum(
                      userProfile?.demographicData?.inferredEmploymentStatus,
                      employmentOptions,
                    )}
                    isLoading={profileLoading}
                    isInferred={true}
                    fieldName="employmentStatus"
                    onVerify={handleVerify}
                  />
                )}
              {!userProfile?.demographicData?.educationLevel &&
                userProfile?.demographicData?.inferredEducationLevel && (
                  <DemoInfoCard
                    icon={HiOutlineAcademicCap}
                    label="Education"
                    value={formatEnum(
                      userProfile?.demographicData?.inferredEducationLevel,
                      educationOptions,
                    )}
                    isLoading={profileLoading}
                    isInferred={true}
                    fieldName="educationLevel"
                    onVerify={handleVerify}
                  />
                )}
            </div>
          )}
        </Card>

        {/* --- Your Interests Card (Right) */}
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
              <List unstyled>
                {preferencesData.preferences.map((pref, index) => {
                  const categoryName =
                    categoryMap.get(pref.category)?.name || pref.category;
                  const attributeEntries = Object.entries(
                    pref.attributes || {},
                  );

                  return (
                    <ListItem
                      key={index}
                      className="mb-3 rounded-lg border border-gray-200 p-4 dark:border-gray-700"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-gray-900 dark:text-white">
                            {categoryName}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Score:{" "}
                            {pref.score !== null && pref.score !== undefined
                              ? `${Math.round(pref.score * 100)}%`
                              : "N/A"}
                          </p>
                          {attributeEntries.length > 0 && (
                            <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              Attributes:{" "}
                              {attributeEntries
                                .map(([attrKey, valueObj]) => {
                                  // Get the first key (value) from the inner object
                                  const attrValue = Object.keys(valueObj)[0];
                                  return `${attrKey}: ${attrValue}`;
                                })
                                .join(", ")}
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Button
                            color="light"
                            size="xs"
                            onClick={() => openEditModal(index)}
                            disabled={isMutating}
                          >
                            <HiPencil />
                          </Button>
                          <Button
                            color="failure"
                            size="xs"
                            onClick={() => handleRemovePreference(index)}
                            disabled={isMutating}
                          >
                            <HiTrash />
                          </Button>
                        </div>
                      </div>
                    </ListItem>
                  );
                })}
              </List>
            ) : (
              <p className="text-center text-gray-500 dark:text-gray-400">
                You haven't added any interests yet.
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
                  .filter((cat) => cat.id) // Ensure category has an ID
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
                          placeholder={`e.g., ${
                            attrName === "color"
                              ? "Blue"
                              : attrName === "brand"
                                ? "Acme"
                                : "Any"
                          }`}
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
