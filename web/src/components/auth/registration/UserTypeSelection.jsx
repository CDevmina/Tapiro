import { Button } from "../../common";

export default function UserTypeSelection({ onSelect, isSubmitting }) {
  return (
    <div className="space-y-6">
      <p className="text-gray-600 mb-4">
        Please select how you'd like to use Tapiro:
      </p>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Button
          onClick={() => onSelect("user")}
          disabled={isSubmitting}
          variant="primary"
          className="p-6 flex flex-col items-center"
        >
          <span className="text-lg font-medium">Regular User</span>
          <span className="text-sm mt-2">
            Browse products and get recommendations
          </span>
        </Button>

        <Button
          onClick={() => onSelect("store")}
          disabled={isSubmitting}
          variant="secondary"
          className="p-6 flex flex-col items-center"
        >
          <span className="text-lg font-medium">Store Owner</span>
          <span className="text-sm mt-2">
            List your store and manage products
          </span>
        </Button>
      </div>
    </div>
  );
}
