import { useAuth } from "../hooks/useAuth";
import { Button, Card, Spinner } from "../components/common";
import { Avatar } from "../components/common";

function Profile() {
  const { user, logout, isLoading } = useAuth();

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Spinner size="xl" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Profile</h1>
      <Card className="p-6">
        <div className="flex flex-col items-center mb-6">
          <Avatar
            src={user.picture}
            name={user.name}
            size="xl"
            className="mb-4"
          />
          <h2 className="text-xl font-bold">{user.name}</h2>
          <p className="text-gray-600">{user.email}</p>
        </div>

        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-700">Email Verification</h3>
            <p>
              {user.email_verified ? (
                <span className="text-green-600">Verified ✓</span>
              ) : (
                <span className="text-red-600">Not verified ⨯</span>
              )}
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-gray-700">User ID</h3>
            <p className="text-sm text-gray-600 break-all">{user.sub}</p>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <Button onClick={logout} variant="secondary" fullWidth>
              Logout
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

export default Profile;
