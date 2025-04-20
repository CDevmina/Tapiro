import { useEffect, useState } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import {
  Button,
  Card,
  FloatingLabel,
  HelperText,
  Spinner,
  Tabs,
  Toast,
  ToastToggle,
  TabItem, // Corrected import
  Modal, // Import Modal
  ModalBody,
  ModalHeader,
} from "flowbite-react";
// Import necessary icons
import {
  HiUserCircle,
  HiCreditCard, // Keep HiCreditCard for Billing tab
  HiCheck,
  HiX,
  HiLockClosed, // Import Lock icon for Security
  HiTrash, // Import Trash icon for Delete
  HiExclamation, // Import Exclamation icon for Modal
} from "react-icons/hi";
import {
  useStoreProfile,
  useUpdateStoreProfile,
  useDeleteStoreProfile, // Import delete hook
} from "../api/hooks/useStoreHooks";
import { StoreUpdate } from "../api/types/data-contracts";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorDisplay from "../components/common/ErrorDisplay";
import { useAuth } from "../hooks/useAuth"; // Import useAuth for logout

// Define the form data structure based on StoreUpdate schema
type StoreProfileFormData = {
  name?: string;
  address?: string;
};

export default function StoreProfilePage() {
  const {
    data: storeProfile,
    isLoading,
    error: fetchError,
  } = useStoreProfile();
  const {
    mutate: updateStore,
    isPending: isUpdating,
    error: updateError,
    isSuccess: isUpdateSuccess, // Rename for clarity
    reset: resetUpdateMutation,
  } = useUpdateStoreProfile();
  const {
    mutate: deleteStore,
    isPending: isDeleting,
    error: deleteError,
    isSuccess: isDeleteSuccess, // Rename for clarity
    reset: resetDeleteMutation,
  } = useDeleteStoreProfile();
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
    formState: { errors, isDirty },
  } = useForm<StoreProfileFormData>({
    defaultValues: {
      name: "",
      address: "",
    },
  });

  // Pre-fill form when storeProfile data loads
  useEffect(() => {
    if (storeProfile) {
      reset({
        name: storeProfile.name || "",
        address: storeProfile.address || "",
      });
    }
  }, [storeProfile, reset]);

  // Show toasts based on UPDATE mutation state
  useEffect(() => {
    if (isUpdateSuccess) {
      setShowSuccessToast(true);
      setToastMessage("Store profile updated successfully!");
      resetUpdateMutation();
      const timer = setTimeout(() => setShowSuccessToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [isUpdateSuccess, resetUpdateMutation]);

  useEffect(() => {
    if (updateError) {
      setShowErrorToast(true);
      setToastMessage(
        updateError.message ||
          "Failed to update store profile. Please try again.",
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
      setToastMessage("Store account deleted successfully.");
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
          "Failed to delete store account. Please try again.",
      );
      resetDeleteMutation();
      const timer = setTimeout(() => setShowErrorToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [deleteError, resetDeleteMutation]);

  const onSubmit: SubmitHandler<StoreProfileFormData> = (data) => {
    const updatePayload: StoreUpdate = {
      name: data.name,
      address: data.address,
    };
    updateStore(updatePayload);
  };

  // Function to handle Auth0 password reset redirection
  const handlePasswordReset = () => {
    const domain = import.meta.env.VITE_AUTH0_DOMAIN;
    window.open(`https://${domain}/passwordreset`, "_blank"); // Open in new tab
  };

  // Function to handle store deletion
  const handleDeleteStore = () => {
    deleteStore(); // Call the mutation
  };

  if (isLoading) {
    return <LoadingSpinner message="Loading store profile..." />;
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
        <Tabs aria-label="Store profile tabs" variant="underline">
          {/* Profile Tab */}
          <TabItem active title="Store Details" icon={HiUserCircle}>
            <form
              onSubmit={handleSubmit(onSubmit)}
              className="flex flex-col gap-6 pt-4"
            >
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                Store Information
              </h2>
              {/* Store Name */}
              <div className="relative">
                <FloatingLabel
                  variant="standard"
                  id="name"
                  label="Store Name"
                  color={errors.name ? "error" : "default"}
                  {...register("name", { required: "Store name is required" })}
                />
                {errors.name?.message && (
                  <HelperText color="failure">{errors.name.message}</HelperText>
                )}
              </div>

              {/* Address */}
              <div className="relative">
                <FloatingLabel
                  variant="standard"
                  id="address"
                  label="Address"
                  color={errors.address ? "error" : "default"}
                  {...register("address")} // Add validation if required
                />
                {errors.address?.message && (
                  <HelperText color="failure">
                    {errors.address.message}
                  </HelperText>
                )}
              </div>

              {/* Save Button */}
              <Button
                type="submit"
                disabled={!isDirty || isUpdating}
                className="mt-4"
              >
                {isUpdating ? (
                  <>
                    <Spinner size="sm" className="mr-3" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </form>
          </TabItem>

          {/* Security Tab - ADDED */}
          <TabItem title="Security" icon={HiLockClosed}>
            <div className="flex flex-col gap-8 pt-4">
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
              {/* Delete Account */}
              <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
                <h3 className="text-md mb-2 font-medium text-red-600 dark:text-red-400">
                  Delete Account
                </h3>
                <p className="mb-3 text-sm text-gray-600 dark:text-gray-400">
                  Permanently delete your store account and all associated data.
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
                      <HiTrash className="mr-2 h-5 w-5" /> Delete Store Account
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabItem>

          {/* Billing Tab (Placeholder) */}
          <TabItem title="Billing" icon={HiCreditCard}>
            <div className="pt-4">
              <h2 className="mb-4 text-xl font-semibold text-gray-900 dark:text-white">
                Billing Information
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                View your subscription details and manage payment methods.
                (Coming Soon)
              </p>
              {/* Add Billing details here later */}
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
              Are you sure you want to permanently delete your store account?
            </h3>
            <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
              All associated data, including API keys and usage history, will be
              lost. This action cannot be undone.
            </p>
            <div className="flex justify-center gap-4">
              <Button
                color="red"
                onClick={handleDeleteStore}
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
