import { useAuth } from "../hooks/useAuth";
import { Card, Spinner } from "../components/common";

function Dashboard() {
  const { user, isLoading, roles } = useAuth();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <Spinner size="xl" />
      </div>
    );
  }

  const isAdmin = roles.includes("admin");
  const isStore = roles.includes("store");

  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Welcome, {user?.name}</h2>
          <p className="text-gray-600">
            You're logged in to the Tapiro dashboard.
          </p>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-bold mb-4">Account Information</h2>
          <div className="space-y-2">
            <p>
              <span className="font-medium">Email:</span> {user?.email}
            </p>
            <p>
              <span className="font-medium">Roles:</span>{" "}
              {roles.length > 0 ? roles.join(", ") : "No roles assigned"}
            </p>
          </div>
        </Card>
      </div>

      {/* Role-specific content */}
      <div className="space-y-6">
        {isAdmin && (
          <Card className="p-6 border-l-4 border-primary-500">
            <h2 className="text-xl font-bold mb-4">Admin Controls</h2>
            <p className="text-gray-600">
              As an admin, you have access to additional controls and settings.
            </p>
            {/* Admin-specific controls would go here */}
          </Card>
        )}

        {isStore && (
          <Card className="p-6 border-l-4 border-blue-500">
            <h2 className="text-xl font-bold mb-4">Store Management</h2>
            <p className="text-gray-600">
              Manage your store settings, products, and advertising campaigns.
            </p>
            {/* Store-specific controls would go here */}
          </Card>
        )}

        {!isAdmin && !isStore && (
          <Card className="p-6 border-l-4 border-green-500">
            <h2 className="text-xl font-bold mb-4">User Dashboard</h2>
            <p className="text-gray-600">
              View personalized recommendations and manage your preferences.
            </p>
            {/* Regular user content would go here */}
          </Card>
        )}
      </div>
    </div>
  );
}

export default Dashboard;
