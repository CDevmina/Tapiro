import React from "react";
import { Card } from "flowbite-react";

const UserAnalyticsPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
        Your Data Insights
      </h2>
      <Card>
        <p className="text-gray-700 dark:text-gray-400">
          View insights derived from the data you've shared, such as spending
          habits and recent activity. (Implementation coming soon!)
        </p>
        {/* Analytics charts and recent activity list will go here */}
      </Card>
    </div>
  );
};

export default UserAnalyticsPage;
