import React from "react";
import { Card } from "flowbite-react";

const UserPreferencesPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
        Manage Your Preferences
      </h2>
      <Card>
        <p className="text-gray-700 dark:text-gray-400">
          Here you can view and update your interest preferences. This helps us
          show you more relevant content and ads. (Implementation coming soon!)
        </p>
        {/* Preference selection UI will go here */}
      </Card>
    </div>
  );
};

export default UserPreferencesPage;
