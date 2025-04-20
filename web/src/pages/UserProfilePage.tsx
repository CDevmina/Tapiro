import { useEffect } from "react";
// Import Controller from react-hook-form
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import {
  Button,
  Card,
  ToggleSwitch,
  Alert,
  FloatingLabel,
  HelperText,
  Spinner,
} from "flowbite-react";
import {
  useUserProfile,
  useUpdateUserProfile,
} from "../api/hooks/useUserHooks";
import { UserUpdate } from "../api/types/data-contracts";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorDisplay from "../components/common/ErrorDisplay";

// Define the form data structure based on UserUpdate schema
type UserProfileFormData = {
  username?: string;
  phone?: string;
  privacySettings_dataSharingConsent?: boolean;
  privacySettings_anonymizeData?: boolean;
};

export default function UserProfilePage() {
  const { data: userProfile, isLoading, error: fetchError } = useUserProfile();
  const {
    mutate: updateUser,
    isPending: isUpdating,
    error: updateError,
    isSuccess,
  } = useUpdateUserProfile();

  const {
    register,
    handleSubmit,
    reset,
    // Add control from useForm
    control,
    formState: { errors, isDirty },
  } = useForm<UserProfileFormData>({
    // Set default values here for better integration
    defaultValues: {
      username: "",
      phone: "",
      privacySettings_dataSharingConsent: false,
      privacySettings_anonymizeData: false,
    },
  });

  // Pre-fill form when userProfile data loads
  useEffect(() => {
    if (userProfile) {
      reset({
        username: userProfile.username || "",
        phone: userProfile.phone || "",
        privacySettings_dataSharingConsent:
          userProfile.privacySettings?.dataSharingConsent ?? false,
        privacySettings_anonymizeData:
          userProfile.privacySettings?.anonymizeData ?? false,
      });
    }
  }, [userProfile, reset]);

  const onSubmit: SubmitHandler<UserProfileFormData> = (data) => {
    // Construct the UserUpdate payload
    const updatePayload: UserUpdate = {
      username: data.username,
      phone: data.phone,
      privacySettings: {
        dataSharingConsent: data.privacySettings_dataSharingConsent,
        anonymizeData: data.privacySettings_anonymizeData,
      },
      // dataAccess can be added here if needed
    };
    updateUser(updatePayload);
  };

  // Use LoadingSpinner for loading state
  if (isLoading) {
    return <LoadingSpinner message="Loading user profile..." />;
  }

  // Use ErrorDisplay for fetch error state
  if (fetchError) {
    return (
      <ErrorDisplay
        title="Error Loading Profile"
        error={fetchError}
        className="container mx-auto p-4"
      />
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <h2 className="mb-4 text-2xl font-bold">User Profile</h2>
        {isSuccess && (
          <Alert color="success" onDismiss={() => {}} className="mb-4">
            Profile updated successfully!
          </Alert>
        )}
        {updateError && (
          <ErrorDisplay
            title="Error Updating Profile"
            error={updateError}
            className="mb-4"
          />
        )}
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* Use FloatingLabel */}
          <div className="relative">
            <FloatingLabel
              variant="standard" // or "filled" or "outlined"
              id="username"
              label="Username"
              color={errors.username ? "error" : "default"}
              {...register("username")}
            />
            {errors.username?.message && (
              <HelperText color="failure">{errors.username.message}</HelperText>
            )}
          </div>

          {/* Use FloatingLabel */}
          <div className="relative">
            <FloatingLabel
              variant="standard"
              id="phone"
              label="Phone Number (e.g., +14155552671)" // Add example format
              color={errors.phone ? "error" : "default"}
              // Add pattern validation (optional but recommended)
              {...register("phone", {
                pattern: {
                  value: /^\+[1-9]\d{1,14}$/, // Basic E.164 regex
                  message:
                    "Phone number must be in E.164 format (e.g., +14155552671)",
                },
              })}
            />
            {/* Display validation error */}
            <HelperText color={errors.phone ? "failure" : "gray"}>
              {errors.phone?.message ||
                "Enter phone number including country code (e.g., +1 for US)."}
            </HelperText>
          </div>

          <h3 className="mt-4 border-t pt-4 text-lg font-semibold">
            Privacy Settings
          </h3>

          {/* Use Controller for ToggleSwitch */}
          <Controller
            name="privacySettings_dataSharingConsent"
            control={control}
            render={({ field }) => (
              <ToggleSwitch
                label="Allow Data Sharing with Stores"
                // Ensure value is always boolean
                checked={field.value ?? false}
                onChange={field.onChange} // Use field.onChange provided by Controller
                // Remove the custom onChange that calls reset
                // Remove {...register(...)}
              />
            )}
          />

          {/* Use Controller for ToggleSwitch */}
          <Controller
            name="privacySettings_anonymizeData"
            control={control}
            render={({ field }) => (
              <ToggleSwitch
                label="Anonymize Data Shared with Stores"
                // Ensure value is always boolean
                checked={field.value ?? false}
                onChange={field.onChange} // Use field.onChange provided by Controller
                // Remove the custom onChange that calls reset
                // Remove {...register(...)}
              />
            )}
          />

          {/* Update Button to use Spinner */}
          <Button type="submit" disabled={!isDirty || isUpdating}>
            {isUpdating ? (
              <>
                <Spinner size="sm" />
                <span className="pl-3">Saving...</span>
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </form>
      </Card>
    </div>
  );
}
