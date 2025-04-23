---

**3. `data_submission.md`**

````markdown
# Data Submission Guide

Stores can submit user interaction data, such as purchases and searches, to Tapiro for analysis and preference building.

## Endpoint

`POST /users/data`

## Purpose

To send batches of user interaction data (purchases or searches) associated with a specific user email address.

## Authentication

Requires a valid API key in the `X-API-Key` header. See [Authentication Guide](./authentication.md).

## Request Body

The request body must be a JSON object conforming to the `UserData` schema:

```json
{
  "email": "user@example.com",
  "dataType": "purchase",
  "entries": [
    {
      "timestamp": "2024-05-15T14:30:00Z",
      "items": [
        {
          "sku": "XYZ-123",
          "name": "Men's Cotton T-Shirt",
          "category": "201", // Must match a category ID or name from the Taxonomy
          "price": 25.99,
          "quantity": 2,
          "attributes": {
            // <-- Optional: Key-value pairs based on Taxonomy for the category
            "color": "navy", // Example: Value for the 'color' attribute
            "size": "M", // Example: Value for the 'size' attribute
            "material": "cotton" // Example: Value for the 'material' attribute
            // Add other relevant attributes defined in the taxonomy for category "201"
          }
        },
        {
          "sku": "ABC-789",
          "name": "Running Shorts",
          "category": "Clothing", // Can use name or ID
          "price": 39.95,
          "quantity": 1,
          "attributes": {
            "color": "black",
            "size": "M",
            "material": "polyester"
          }
        }
      ],
      "totalValue": 91.93
    }
    // Add more PurchaseEntry objects if submitting multiple purchases in one batch
  ],
  "metadata": {
    "source": "web",
    "deviceType": "desktop",
    "sessionId": "abc-123-xyz-789"
  }
}
```
````
