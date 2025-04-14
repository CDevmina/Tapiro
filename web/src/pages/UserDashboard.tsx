import { Card } from "flowbite-react"; // Use Heading instead of Title

export default function UserDashboard() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h2 className="mb-4">
        {" "}
        {/* Changed from Title */}
        User Dashboard
      </h2>
      <Card>
        <p className="text-gray-700 dark:text-gray-400">
          Welcome to your dashboard. Here you can manage your preferences,
          control data sharing with stores, and view your usage analytics.
          (Content coming soon!)
        </p>
        {/* Add User Preference Management and Analytics sections later */}
      </Card>
    </div>
  );
}
