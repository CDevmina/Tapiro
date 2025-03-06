import { useAuth } from "../hooks/useAuth";
import { Card, Spinner } from "../components/common";

function StoreDashboard() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Store Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Welcome, {user?.name}</h2>
          <p className="text-gray-600">
            Manage your store settings, products, and campaigns.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Store Overview</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Store Email:</span> {user?.email}
            </p>
            <p>
              <span className="font-medium">Account Status:</span>{" "}
              <span className="text-green-500">Active</span>
            </p>
          </div>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="p-6 border-l-4 border-blue-500">
          <h2 className="text-xl font-bold mb-4">Store Management</h2>
          <p className="text-gray-600">
            Configure your store settings, add products, and manage inventory.
          </p>
          {/* Store management controls would go here */}
        </Card>

        <Card className="p-6 border-l-4 border-primary-500">
          <h2 className="text-xl font-bold mb-4">Campaign Analytics</h2>
          <p className="text-gray-600">
            View statistics and analytics for your advertising campaigns.
          </p>
          {/* Analytics dashboard would go here */}
        </Card>
      </div>
    </div>
  );
}

export default StoreDashboard;
