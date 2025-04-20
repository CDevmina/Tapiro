import { Button, Card } from "flowbite-react";
import { useState } from "react";
import { FaUser, FaStore } from "react-icons/fa";

interface RegistrationTypeSelectorProps {
  onTypeSelected: (type: "user" | "store") => void;
}

export function RegistrationTypeSelector({
  onTypeSelected,
}: RegistrationTypeSelectorProps) {
  const [selectedType, setSelectedType] = useState<"user" | "store" | null>(
    null,
  );

  const handleTypeSelect = (type: "user" | "store") => {
    setSelectedType(type);
  };

  const handleContinue = () => {
    if (selectedType) {
      onTypeSelected(selectedType);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add dark mode text color */}
      <h3 className="text-center text-xl font-medium text-gray-900 dark:text-white">
        Choose Registration Type
      </h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* User Card */}
        <Card
          className={`cursor-pointer transition-all duration-200 ease-in-out hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedType === "user" ? "ring-2 ring-blue-500 dark:ring-blue-400" : "ring-1 ring-gray-200 dark:ring-gray-700"}`}
          onClick={() => handleTypeSelect("user")}
        >
          {/* Add min-h-* to ensure consistent height */}
          <div className="flex min-h-[180px] flex-col items-center p-4">
            {" "}
            {/* Adjust min-h value as needed */}
            <FaUser className="mb-3 h-12 w-12 text-blue-600 dark:text-blue-500" />
            <h5 className="mb-1 text-center text-lg font-bold text-gray-900 dark:text-white">
              {" "}
              {/* Ensure text-center */}
              Individual User
            </h5>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Get personalized recommendations while browsing stores
            </p>
          </div>
        </Card>

        {/* Store Card */}
        <Card
          className={`cursor-pointer transition-all duration-200 ease-in-out hover:bg-gray-50 dark:hover:bg-gray-700 ${selectedType === "store" ? "ring-2 ring-blue-500 dark:ring-blue-400" : "ring-1 ring-gray-200 dark:ring-gray-700"}`}
          onClick={() => handleTypeSelect("store")}
        >
          {/* Add min-h-* to ensure consistent height */}
          <div className="flex min-h-[180px] flex-col items-center p-4">
            {" "}
            {/* Adjust min-h value as needed */}
            <FaStore className="mb-3 h-12 w-12 text-blue-600 dark:text-blue-500" />
            <h5 className="mb-1 text-center text-lg font-bold text-gray-900 dark:text-white">
              {" "}
              {/* Ensure text-center */}
              Store Owner
            </h5>
            <p className="text-center text-sm text-gray-500 dark:text-gray-400">
              Integrate with our API to provide targeted recommendations
            </p>
          </div>
        </Card>
      </div>

      <div className="flex justify-center pt-2">
        {/* Flowbite Button handles dark mode */}
        <Button
          onClick={handleContinue}
          disabled={!selectedType}
          className="w-full md:w-auto"
          size="lg"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
