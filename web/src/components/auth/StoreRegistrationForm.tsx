import { useForm, SubmitHandler } from "react-hook-form"; // Import useForm and SubmitHandler
import { Button, FloatingLabel, HelperText } from "flowbite-react";
import { StoreCreate } from "../../api/types/data-contracts";
import LoadingSpinner from "../common/LoadingSpinner";

interface StoreRegistrationFormProps {
  onSubmit: (storeData: StoreCreate) => void;
  isLoading: boolean;
}

// Define form data type
type StoreRegistrationFormData = {
  name: string;
  address?: string; // Address is optional based on current setup
};

export function StoreRegistrationForm({
  onSubmit,
  isLoading,
}: StoreRegistrationFormProps) {
  // Initialize react-hook-form
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<StoreRegistrationFormData>();

  // Use the handleSubmit from react-hook-form
  const handleFormSubmit: SubmitHandler<StoreRegistrationFormData> = (data) => {
    const storeData: StoreCreate = {
      name: data.name,
      address: data.address || "", // Ensure address is string or empty string
      webhooks: [],
    };
    onSubmit(storeData);
  };

  return (
    // Use the handleSubmit from react-hook-form
    <form className="space-y-6" onSubmit={handleSubmit(handleFormSubmit)}>
      <h3 className="text-center text-xl font-medium text-gray-900 dark:text-white">
        Complete Store Registration
      </h3>

      {/* Store Name with FloatingLabel and Icon */}
      <div className="relative">
        <FloatingLabel
          variant="outlined"
          id="store-name"
          label="Store Name"
          color={errors.name ? "error" : "default"} // Use errors object
          // Register the input with validation
          {...register("name", {
            required: "Store name is required",
            minLength: {
              value: 2,
              message: "Name must be at least 2 characters",
            },
            maxLength: {
              value: 100,
              message: "Name cannot exceed 100 characters",
            },
          })}
          required // Keep HTML required for accessibility/native behavior
        />
        {/* Display validation error */}
        {errors.name && (
          <HelperText color="failure" className="mt-1">
            {errors.name.message}
          </HelperText>
        )}
      </div>

      {/* Store Address with FloatingLabel and Icon */}
      <div className="relative">
        <FloatingLabel
          variant="outlined"
          id="store-address"
          label="Store Address"
          color={errors.address ? "error" : "default"} // Use errors object
          // Register the input (optional validation)
          {...register("address", {
            maxLength: {
              value: 200,
              message: "Address cannot exceed 200 characters",
            },
          })}
        />
        {/* Display validation error */}
        {errors.address && (
          <HelperText color="failure" className="mt-1">
            {errors.address.message}
          </HelperText>
        )}
        {!errors.address && ( // Show helper text only if no error
          <HelperText color="gray" className="mt-1">
            Optional: Provide a physical or primary business address.
          </HelperText>
        )}
      </div>

      <div className="flex justify-center pt-2">
        {isLoading ? (
          <LoadingSpinner size="md" className="py-2" />
        ) : (
          // No need to manually disable based on name state anymore
          <Button type="submit" disabled={isLoading} size="lg">
            Complete Registration
          </Button>
        )}
      </div>
    </form>
  );
}
