import { Card } from "flowbite-react";

export default function StoreDashboard() {
  // Corrected function name
  return (
    <div className="container mx-auto px-4 py-12">
      <h2 className="mb-4">Store Dashboard - API Management</h2>
      <Card>
        <p className="text-gray-700 dark:text-gray-400">
          Welcome to the store dashboard. Manage your API keys, view usage
          statistics, and access billing information here. (Content coming
          soon!)
        </p>
        {/* Add API Key Management, Analytics, and Billing sections later */}
      </Card>
    </div>
  );
}
