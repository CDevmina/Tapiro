import { Card } from "flowbite-react"; // Use h4

export default function ApiDocsPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <h2 className="mb-4">API Documentation</h2>
      <Card>
        <p className="mb-4 text-gray-700 dark:text-gray-400">
          Welcome to the Tapiro API documentation. This guide provides details
          on how stores can integrate with our platform to send user interaction
          data and retrieve preference profiles for personalization.
        </p>
        <h4 className="mt-4 mb-2">Authentication</h4>
        <p className="mb-4 text-gray-700 dark:text-gray-400">
          All API requests must be authenticated using an API key provided via
          the Store Dashboard. Include your key in the `Authorization` header as
          a Bearer token.
        </p>
        <pre className="mb-4 overflow-auto rounded bg-gray-100 p-2 dark:bg-gray-800 dark:text-gray-300">
          <code>Authorization: Bearer YOUR_API_KEY</code>
        </pre>
        <h4 className="mt-4 mb-2">Endpoints</h4>
        <p className="mb-2 text-gray-700 dark:text-gray-400">
          Below is an example of submitting user interaction data. More
          endpoints (e.g., for retrieving preferences) will be documented soon.
        </p>
        <h5 className="mt-3 mb-1 font-semibold">POST /v1/interactions</h5>
        <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
          Sends user interaction data (e.g., purchases, views) to Tapiro for
          analysis.
        </p>
        <pre className="overflow-auto rounded bg-gray-100 p-4 dark:bg-gray-800 dark:text-gray-300">
          <code>
            {`POST /v1/interactionsAuthorization: Bearer YOUR_API_KEY Content-Type: application/json

{ "userId": "store-specific-user-id-123", "sessionId": "session-abc-456", "eventType": "purchase", "timestamp": "2025-04-14T10:30:00Z", "details": { "items": [ { "productId": "prod-a", "name": "Running Shoes", "category": "Footwear", "price": 89.99, "quantity": 1 }, { "productId": "prod-b", "name": "Sports Socks", "category": "Apparel", "price": 9.99, "quantity": 2 } ], "totalValue": 109.97 }, "metadata": { "source": "web", "deviceType": "desktop" } }`}{" "}
          </code>{" "}
        </pre>{" "}
        {/* Add more endpoint details later */}{" "}
      </Card>{" "}
    </div>
  );
}
