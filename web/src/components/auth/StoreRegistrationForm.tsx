import { useForm, SubmitHandler } from "react-hook-form";
import { Button, HelperText, Label, TextInput } from "flowbite-react"; // Import Label and TextInput
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

      {/* Store Name */}
      <div>
        <div className="mb-2 block">
          <Label
            htmlFor="store-name"
            color={errors.name ? "failure" : "default"}
          >
            Store Name
          </Label>
        </div>
        <TextInput
          id="store-name"
          placeholder="Enter your store name"
          color={errors.name ? "failure" : "gray"}
          required
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
        />
        {errors.name && (
          <HelperText color="failure" className="mt-1">
            {errors.name.message}
          </HelperText>
        )}
      </div>

      {/* Store Address */}
      <div>
        <div className="mb-2 block">
          <Label
            htmlFor="store-address"
            color={errors.address ? "failure" : "default"}
          >
            Store Address (Optional)
          </Label>
        </div>
        <TextInput
          id="store-address"
          placeholder="Enter your store address"
          color={errors.address ? "failure" : "gray"}
          {...register("address", {
            maxLength: {
              value: 200,
              message: "Address cannot exceed 200 characters",
            },
          })}
        />
        {errors.address && (
          <HelperText color="failure" className="mt-1">
            {errors.address.message}
          </HelperText>
        )}
        {!errors.address && (
          <HelperText color="gray" className="mt-1">
            Optional: Provide a physical or primary business address.
          </HelperText>
        )}
      </div>

      <div className="flex justify-center pt-2">
        {isLoading ? (
          <LoadingSpinner size="md" className="py-2" />
        ) : (
          <Button type="submit" disabled={isLoading} size="lg">
            Complete Registration
          </Button>
        )}
      </div>
    </form>
  );
}
