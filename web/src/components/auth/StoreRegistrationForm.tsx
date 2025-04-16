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
      <h3 className="text-center text-xl font-medium text-gray-900 dark:text-white">
        Complete Store Registration
      </h3>

      <div>
        <div className="mb-2 block">
          <Label htmlFor="store-name">Store Name</Label>
        </div>
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
          <Label htmlFor="store-address">Store Address</Label>
        </div>
        <TextInput
          id="store-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Enter your store address"
          required
        />
      </div>

      <div className="flex justify-center">
        {isLoading ? (
          <LoadingSpinner size="md" className="py-2" />
        ) : (
          <Button type="submit" disabled={isLoading}>
            Complete Registration
          </Button>
        )}
      </div>
    </form>
  );
}
