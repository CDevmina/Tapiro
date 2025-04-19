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
      {/* Add dark mode text color */}
      <h3 className="text-center text-xl font-medium text-gray-900 dark:text-white">
        Complete User Registration
      </h3>

      <div className="flex items-center gap-2">
        {/* Flowbite Checkbox handles dark mode */}
        <Checkbox
          id="data-sharing"
          checked={dataSharingConsent}
          onChange={(e) => setDataSharingConsent(e.target.checked)}
          required
        />
        {/* Add dark mode text color */}
        <Label
          htmlFor="data-sharing"
          className="flex text-gray-700 dark:text-gray-300"
        >
          I consent to sharing my data for personalized recommendations
        </Label>
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
