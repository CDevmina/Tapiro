import { useState } from "react";
import { Button, Label, TextInput } from "flowbite-react";
import { StoreCreate } from "../../api/types/data-contracts";
import LoadingSpinner from "../common/LoadingSpinner";

interface StoreRegistrationFormProps {
  onSubmit: (storeData: StoreCreate) => void;
  isLoading: boolean;
}

export function StoreRegistrationForm({
  onSubmit,
  isLoading,
}: StoreRegistrationFormProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const storeData: StoreCreate = {
      name,
      address,
      webhooks: [], // We can leave this empty for now
    };

    onSubmit(storeData);
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {/* Add dark mode text color */}
      <h3 className="text-center text-xl font-medium text-gray-900 dark:text-white">
        Complete Store Registration
      </h3>

      <div>
        <div className="mb-2 block">
          {/* Add dark mode text color */}
          <Label
            htmlFor="store-name"
            className="text-gray-700 dark:text-gray-300"
          >
            Store Name
          </Label>
        </div>
        {/* Flowbite TextInput handles dark mode */}
        <TextInput
          id="store-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your store name"
          required
        />
      </div>

      <div>
        <div className="mb-2 block">
          {/* Add dark mode text color */}
          <Label
            htmlFor="store-address"
            className="text-gray-700 dark:text-gray-300"
          >
            Store Address
          </Label>
        </div>
        {/* Flowbite TextInput handles dark mode */}
        <TextInput
          id="store-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter your store address"
          required
        />
      </div>

      <div className="flex justify-center pt-2">
        {isLoading ? (
          <LoadingSpinner size="md" className="py-2" />
        ) : (
          // Flowbite Button handles dark mode
          <Button type="submit" disabled={isLoading} size="lg">
            Complete Registration
          </Button>
        )}
      </div>
    </form>
  );
}
