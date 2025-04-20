import { useEffect } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import {
  Button,
  Card,
  // Remove Textarea and Label imports if no longer needed elsewhere
  // Textarea,
  // Label,
  Alert,
  FloatingLabel, // Ensure this is imported
  HelperText, // Ensure this is imported
  Spinner, // Import Spinner
} from "flowbite-react";
import {
  useStoreProfile,
  useUpdateStoreProfile,
} from "../api/hooks/useStoreHooks";
import { StoreUpdate } from "../api/types/data-contracts";
import LoadingSpinner from "../components/common/LoadingSpinner";
import ErrorDisplay from "../components/common/ErrorDisplay";

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
    isSuccess,
  } = useUpdateStoreProfile();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<StoreProfileFormData>({
    // Set default values
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

  const onSubmit: SubmitHandler<StoreProfileFormData> = (data) => {
    const updatePayload: StoreUpdate = {
      name: data.name,
      address: data.address,
    };
    updateStore(updatePayload);
  };

  // Use LoadingSpinner for loading state
  if (isLoading) {
    return <LoadingSpinner message="Loading store profile..." />;
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
        <h2 className="mb-4 text-2xl font-bold">Store Profile</h2>
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
          {/* Use FloatingLabel for Store Name */}
          <div className="relative">
            <FloatingLabel
              variant="standard" // or "filled" or "outlined"
              id="name"
              label="Store Name"
              color={errors.name ? "error" : "default"}
              {...register("name", { required: "Store name is required" })}
            />
            {errors.name?.message && (
              <HelperText color="failure">{errors.name.message}</HelperText>
            )}
          </div>

          {/* Use FloatingLabel for Address */}
          <div className="relative">
            <FloatingLabel
              variant="standard"
              id="address"
              label="Address"
              // Note: FloatingLabel renders an <input>, not <textarea>.
              // For multi-line input, Textarea might still be preferred,
              // but FloatingLabel resolves the helperText prop issue.
              // If a true multi-line floating label is needed, custom CSS
              // or a different component might be required.
              color={errors.address ? "error" : "default"}
              {...register("address")} // Add validation if address is required
            />
            {errors.address?.message && (
              <HelperText color="failure">{errors.address.message}</HelperText>
            )}
          </div>

          {/* Update Button to use Spinner */}
          <Button type="submit" disabled={!isDirty || isUpdating}>
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
      </Card>
    </div>
  );
}
