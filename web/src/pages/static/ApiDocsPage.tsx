import { Card } from "flowbite-react";

export default function ApiDocsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      {/* Add dark mode text color */}
      <h2 className="mb-4 text-2xl font-bold text-gray-900 dark:text-white">
        API Documentation
      </h2>
      <Card>
        {/* Add dark mode text color */}
        <p className="mb-4 text-gray-700 dark:text-gray-400">
          Welcome to the Tapiro API documentation. This guide provides details
          on how stores can integrate with our platform to send user interaction
          data and retrieve preference profiles for personalization.
        </p>
        {/* Add dark mode text color */}
        <h4 className="mt-4 mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          Authentication
        </h4>
        {/* Add dark mode text color */}
        <p className="mb-4 text-gray-700 dark:text-gray-400">
          All API requests must be authenticated using an API key provided via
          the Store Dashboard. Include your key in the `Authorization` header as
          a Bearer token.
        </p>
        {/* Adjusted pre/code dark mode styles */}
        <pre className="mb-4 overflow-auto rounded bg-gray-100 p-2 dark:bg-gray-700">
          <code className="text-gray-800 dark:text-gray-300">
            Authorization: Bearer YOUR_API_KEY
          </code>
        </pre>
        {/* Add dark mode text color */}
        <h4 className="mt-4 mb-2 text-xl font-semibold text-gray-900 dark:text-white">
          Endpoints
        </h4>
        {/* Add dark mode text color */}
        <p className="mb-2 text-gray-700 dark:text-gray-400">
          Below is an example of submitting user interaction data. More
          endpoints (e.g., for retrieving preferences) will be documented soon.
        </p>
        {/* Add dark mode text color */}
        <h5 className="mt-3 mb-1 font-semibold text-gray-900 dark:text-white">
          POST /interactions
        </h5>
        {/* Add dark mode text color */}
        <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
          Sends user interaction data (e.g., purchases, views) to Tapiro for
          analysis.
        </p>
        {/* Adjusted pre/code dark mode styles */}
        <pre className="overflow-auto rounded bg-gray-100 p-4 dark:bg-gray-700">
          <code className="text-gray-800 dark:text-gray-300">
            {`POST /interactions
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
X-API-Key: YOUR_STORE_API_KEY // Corrected Header

{
  "userId": "store-specific-user-id-123",
  "sessionId": "session-abc-456",
  "eventType": "purchase",
  "timestamp": "2025-04-14T10:30:00Z",
  "details": {
    "items": [
      { "productId": "prod-a", "name": "Running Shoes", "category": "Footwear", "price": 89.99, "quantity": 1 },
      { "productId": "prod-b", "name": "Sports Socks", "category": "Apparel", "price": 9.99, "quantity": 2 }
    ],
    "totalValue": 109.97
  },
  "metadata": {
    "source": "web",
    "deviceType": "desktop"
  }
}`}
          </code>
        </pre>
        {/* Add dark mode text color */}
        <h5 className="mt-3 mb-1 font-semibold text-gray-900 dark:text-white">
          POST /users/data
        </h5>
        {/* Add dark mode text color */}
        <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
          Sends user data (e.g., email, purchase data) to Tapiro for analysis.
        </p>
        {/* Adjusted pre/code dark mode styles */}
        <pre className="overflow-auto rounded bg-gray-100 p-4 dark:bg-gray-700">
          <code className="text-gray-800 dark:text-gray-300">
            {`POST /users/data HTTP/1.1
Host: api.tapiro.com
Content-Type: application/json
X-API-Key: YOUR_API_KEY  // Changed from Authorization: Bearer

{
  "email": "user@example.com",
  "dataType": "purchase",
  "entries": [ ... ]
}`}
          </code>
        </pre>
      </Card>
    </div>
  );
}
