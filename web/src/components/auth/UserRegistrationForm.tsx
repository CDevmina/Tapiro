import { useState } from "react";
import { Button, Checkbox, Label } from "flowbite-react";
import { UserCreate } from "../../api/types/data-contracts";
import LoadingSpinner from "../common/LoadingSpinner";

interface UserRegistrationFormProps {
  onSubmit: (userData: UserCreate) => void;
  isLoading: boolean;
}

export function UserRegistrationForm({
  onSubmit,
  isLoading,
}: UserRegistrationFormProps) {
  const [dataSharingConsent, setDataSharingConsent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const userData: UserCreate = {
      dataSharingConsent,
      preferences: [], // We can leave this empty for now
    };

    onSubmit(userData);
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      <h3 className="text-center text-xl font-medium text-gray-900 dark:text-white">
        Complete User Registration
      </h3>

      <div className="flex items-center gap-2">
        <Checkbox
          id="data-sharing"
          checked={dataSharingConsent}
          onChange={(e) => setDataSharingConsent(e.target.checked)}
          required
        />
        <Label htmlFor="data-sharing" className="flex">
          I consent to sharing my data for personalized recommendations
        </Label>
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
