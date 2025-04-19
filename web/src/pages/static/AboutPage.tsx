import { Card } from "flowbite-react";

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Add dark mode text color */}
      <h1 className="mb-4 text-3xl font-bold text-gray-900 dark:text-white">
        About Tapiro
      </h1>
      <Card>
        {/* Add dark mode text color */}
        <p className="mb-4 text-gray-700 dark:text-gray-400">
          Tapiro is a platform designed to empower users by giving them control
          over their data shared with online stores, while enabling stores to
          deliver truly personalized experiences.
        </p>
        {/* Add dark mode text color */}
        <h4 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          For Users
        </h4>
        {/* Add dark mode text color */}
        <p className="mb-4 text-gray-700 dark:text-gray-400">
          Manage your preference profile, see which stores have access to your
          anonymized data, and opt-in or out at any time. Understand how your
          data contributes to personalized recommendations and offers.
        </p>
        {/* Add dark mode text color */}
        <h4 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          For Stores
        </h4>
        {/* Add dark mode text color */}
        <p className="text-gray-700 dark:text-gray-400">
          Integrate our API to send anonymized user interaction data (like
          views, purchases, searches) and receive valuable preference insights
          to personalize your customer's journey, recommend relevant products,
          and optimize your offerings.
        </p>
      </Card>
    </div>
  );
}
