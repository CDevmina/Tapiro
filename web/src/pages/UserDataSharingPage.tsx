import React from "react";
import { Card } from "flowbite-react";

const UserDataSharingPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-12">
      <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
        Control Data Sharing
      </h2>
      <Card>
        <p className="mb-4 text-gray-700 dark:text-gray-400">
          Manage which stores you allow to access your preference data. You can
          opt-in or opt-out from individual stores at any time. (Implementation
          coming soon!)
        </p>
        {/* Opt-in/Opt-out UI will go here */}
      </Card>
    </div>
  );
};

export default UserDataSharingPage;
