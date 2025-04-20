import { useEffect, useState } from "react";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import {
  Button,
  Card,
  ToggleSwitch,
  FloatingLabel,
  HelperText,
  Spinner,
  Tabs,
  Toast,
  ToastToggle,
  TabItem, // Added TabItem import
  Modal, // Import Modal
  ModalBody,
  ModalHeader,
} from "flowbite-react";
// Import necessary icons
import {
  HiUserCircle,
  HiShieldCheck,
  HiLockClosed,
  HiCheck,
  HiX,
  HiTrash, // Import Trash icon for Delete
  HiExclamation, // Import Exclamation icon for Modal
} from "react-icons/hi";
import {
  useUserProfile,
  useUpdateUserProfile,
  useDeleteUserProfile, // Import delete hook
} from "../api/hooks/useUserHooks";
import { UserUpdate } from "../api/types/data-contracts";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorDisplay from "../components/common/ErrorDisplay";
import { useAuth } from "../hooks/useAuth"; // Import useAuth for logout

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
    isSuccess: isUpdateSuccess, // Rename for clarity
    reset: resetUpdateMutation,
  } = useUpdateUserProfile();
  const {
    mutate: deleteUser,
    isPending: isDeleting,
    error: deleteError,
    isSuccess: isDeleteSuccess, // Rename for clarity
    reset: resetDeleteMutation,
  } = useDeleteUserProfile();
  const { logout } = useAuth(); // Get logout function

  // State for toasts
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showErrorToast, setShowErrorToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  // State for delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<UserProfileFormData>({
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

  // Show toasts based on UPDATE mutation state
  useEffect(() => {
    if (isUpdateSuccess) {
      setShowSuccessToast(true);
      setToastMessage("Profile updated successfully!");
      resetUpdateMutation();
      const timer = setTimeout(() => setShowSuccessToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isUpdateSuccess, resetUpdateMutation]);

  useEffect(() => {
    if (updateError) {
      setShowErrorToast(true);
      setToastMessage(
        updateError.message || "Failed to update profile. Please try again.",
      );
      resetUpdateMutation();
      const timer = setTimeout(() => setShowErrorToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [updateError, resetUpdateMutation]);

  // Show toasts/handle redirect based on DELETE mutation state
  useEffect(() => {
    if (isDeleteSuccess) {
      setShowDeleteModal(false); // Close modal on success
      // Show toast briefly before logout/redirect
      setShowSuccessToast(true);
      setToastMessage("User account deleted successfully.");
      resetDeleteMutation();
      // Logout after a short delay to allow toast visibility
      const timer = setTimeout(() => {
        setShowSuccessToast(false);
        logout(); // <-- Use default logout behavior
      }, 3000); // Adjust delay as needed
      return () => clearTimeout(timer);
    }
  }, [isDeleteSuccess, resetDeleteMutation, logout]);

  useEffect(() => {
    if (deleteError) {
      // Keep modal open on error? Or close and show toast? Closing for now.
      setShowDeleteModal(false);
      setShowErrorToast(true);
      setToastMessage(
        deleteError.message ||
          "Failed to delete user account. Please try again.",
      );
      resetDeleteMutation();
      const timer = setTimeout(() => setShowErrorToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [deleteError, resetDeleteMutation]);

  const onSubmit: SubmitHandler<UserProfileFormData> = (data) => {
    const updatePayload: UserUpdate = {
      username: data.username,
      phone: data.phone,
      privacySettings: {
        dataSharingConsent: data.privacySettings_dataSharingConsent,
        anonymizeData: data.privacySettings_anonymizeData,
      },
    };
    updateUser(updatePayload);
  };

  // Function to handle Auth0 password reset redirection
  const handlePasswordReset = () => {
    const domain = import.meta.env.VITE_AUTH0_DOMAIN;
    window.open(`https://${domain}/passwordreset`, "_blank"); // Open in new tab
  };

  // Function to handle user deletion
  const handleDeleteUser = () => {
    deleteUser(); // Call the mutation
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading user profile..." />;
  }

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
    <div className="relative container mx-auto p-4">
      {/* Success Toast */}
      {showSuccessToast && (
        <Toast className="absolute top-5 right-5 z-50">
          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-green-100 text-green-500 dark:bg-green-800 dark:text-green-200">
            <HiCheck className="h-5 w-5" />
          </div>
          <div className="ml-3 text-sm font-normal">{toastMessage}</div>
          <ToastToggle onDismiss={() => setShowSuccessToast(false)} />
        </Toast>
      )}

      {/* Error Toast */}
      {showErrorToast && (
        <Toast className="absolute top-5 right-5 z-50">
          <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-500 dark:bg-red-800 dark:text-red-200">
            <HiX className="h-5 w-5" />
          </div>
          <div className="ml-3 text-sm font-normal">{toastMessage}</div>
          <ToastToggle onDismiss={() => setShowErrorToast(false)} />
        </Toast>
      )}

      <Card>
        {/* Use Tabs for organization */}
        <Tabs aria-label="User profile tabs" variant="underline">
          {/* Profile Tab */}
          <TabItem active title="Profile" icon={HiUserCircle}>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-6 pt-4"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Basic Information
              </h2>
              {/* Username */}
              <div className="relative">
                <FloatingLabel
                  variant="standard"
                  id="username"
                  label="Username"
                  color={errors.username ? "error" : "default"}
                  {...register("username")}
                />
                {errors.username?.message && (
                  <HelperText color="failure">
                    {errors.username.message}
                  </HelperText>
                )}
              </div>

              {/* Phone Number */}
              <div className="relative">
                <FloatingLabel
                  variant="standard"
                  id="phone"
                  label="Phone Number (e.g., +14155552671)"
                  color={errors.phone ? "error" : "default"}
                  {...register("phone", {
                    pattern: {
                      value: /^\+[1-9]\d{1,14}$/,
                      message:
                        "Phone number must be in E.164 format (e.g., +14155552671)",
                    },
                  })}
                />
                <HelperText color={errors.phone ? "failure" : "gray"}>
                  {errors.phone?.message ||
                    "Enter phone number including country code (e.g., +1 for US)."}
                </HelperText>
              </div>
              {/* Save Button - Common for all tabs within the form */}
              <Button
                type="submit"
                disabled={!isDirty || isUpdating}
                className="mt-4"
              >
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
          </TabItem>

          {/* Privacy Tab */}
          <TabItem title="Privacy" icon={HiShieldCheck}>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-6 pt-4"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Privacy Settings
              </h2>
              {/* Data Sharing Consent */}
              <Controller
                name="privacySettings_dataSharingConsent"
                control={control}
                render={({ field }) => (
                  <ToggleSwitch
                    label="Allow Data Sharing with Stores"
                    checked={field.value ?? false}
                    onChange={field.onChange}
                  />
                )}
              />
              {/* Anonymize Data */}
              <Controller
                name="privacySettings_anonymizeData"
                control={control}
                render={({ field }) => (
                  <ToggleSwitch
                    label="Anonymize Data Shared with Stores"
                    checked={field.value ?? false}
                    onChange={field.onChange}
                  />
                )}
              />
              {/* Save Button - Common for all tabs within the form */}
              <Button
                type="submit"
                disabled={!isDirty || isUpdating}
                className="mt-4"
              >
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
          </TabItem>

          {/* Security Tab */}
          <TabItem title="Security" icon={HiLockClosed}>
            <div className="flex flex-col gap-8 pt-4">
              {" "}
              {/* Increased gap */}
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Security Settings
              </h2>
              {/* Password Reset */}
              <div>
                <h3 className="text-md mb-2 font-medium text-gray-900 dark:text-white">
                  Password
                </h3>
                <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                  Manage your account password via our authentication provider.
                </p>
                <Button color="light" onClick={handlePasswordReset}>
                  Change Password
                </Button>
              </div>
              {/* MFA */}
              <div>
                <h3 className="text-md mb-2 font-medium text-gray-900 dark:text-white">
                  Multi-Factor Authentication (MFA)
                </h3>
                <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                  Add an extra layer of security to your account. (Coming Soon)
                </p>
                <Button color="light" disabled>
                  Enable MFA (Not Available)
                </Button>
              </div>
              {/* Delete Account - ADDED */}
              <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                <h3 className="text-md mb-2 font-medium text-red-600 dark:text-red-400">
                  Delete Account
                </h3>
                <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                  Permanently delete your user account and all associated data.
                  This action cannot be undone.
                </p>
                <Button
                  color="red"
                  outline // <-- Add this prop
                  onClick={() => setShowDeleteModal(true)}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Spinner size="sm" className="mr-3" /> Deleting...
                    </>
                  ) : (
                    <>
                      <HiTrash className="mr-2 h-5 w-5" /> Delete My Account
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabItem>
        </Tabs>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        show={showDeleteModal}
        size="md"
        onClose={() => !isDeleting && setShowDeleteModal(false)} // Prevent closing while deleting
        popup
      >
        <ModalHeader />
        <ModalBody>
          <div className="text-center">
            <HiExclamation className="mx-auto mb-4 h-14 w-14 text-gray-400 dark:text-gray-200" />
            <h3 className="mb-5 text-lg font-normal text-gray-500 dark:text-gray-400">
              Are you sure you want to permanently delete your user account?
            </h3>
            <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
              All associated data, including preferences and sharing settings,
              will be lost. This action cannot be undone.
            </p>
            <div className="flex justify-center gap-4">
              <Button
                color="red"
                onClick={handleDeleteUser}
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <Spinner size="sm" className="mr-3" /> Deleting...
                  </>
                ) : (
                  "Yes, I'm sure"
                )}
              </Button>
              <Button
                color="dark"
                outline
                onClick={() => setShowDeleteModal(false)}
                disabled={isDeleting}
              >
                No, cancel
              </Button>
            </div>
          </div>
        </ModalBody>
      </Modal>
    </div>
  );
}
