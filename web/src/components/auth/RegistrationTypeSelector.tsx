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
      <h3 className="text-center text-xl font-medium text-gray-900 dark:text-white">
        Choose Registration Type
      </h3>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card
          className={`cursor-pointer ${selectedType === "user" ? "ring-2 ring-blue-500" : ""}`}
          onClick={() => handleTypeSelect("user")}
        >
          <div className="flex flex-col items-center">
            <FaUser className="mb-2 h-12 w-12 text-blue-600" />
            <h5 className="text-lg font-bold">Individual User</h5>
            <p className="text-center text-sm text-gray-500">
              Get personalized recommendations while browsing stores
            </p>
          </div>
        </Card>

        <Card
          className={`cursor-pointer ${selectedType === "store" ? "ring-2 ring-blue-500" : ""}`}
          onClick={() => handleTypeSelect("store")}
        >
          <div className="flex flex-col items-center">
            <FaStore className="mb-2 h-12 w-12 text-blue-600" />
            <h5 className="text-lg font-bold">Store Owner</h5>
            <p className="text-center text-sm text-gray-500">
              Integrate with our API to provide targeted recommendations
            </p>
          </div>
        </Card>
      </div>

      <div className="flex justify-center">
        <Button
          onClick={handleContinue}
          disabled={!selectedType}
          className="w-full md:w-auto"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
