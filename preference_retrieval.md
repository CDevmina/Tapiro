---

**4. `preference_retrieval.md`**

````markdown
# Preference Retrieval Guide

Stores can retrieve processed user preferences from Tapiro to personalize experiences like targeted advertising or product recommendations.

## Endpoint

`GET /users/{userId}/preferences`

## Purpose

To retrieve the calculated interest preferences for a specific user, based on data submitted to Tapiro.

## Authentication

Requires a valid API key in the `X-API-Key` header. See [Authentication Guide](./authentication.md).

## Path Parameter

- `{userId}` (string, required): The **email address** of the user whose preferences you want to retrieve.

**Example URL:**

`/users/user@example.com/preferences`

## Response

- **`200 OK`**: Successfully retrieved user preferences. The response body will contain a `UserPreferences` object.

  ```json
  {
    "userId": "60d5ecb8b48f4a001f9e8f6a", // Tapiro's internal User ID
    "preferences": [
      {
        "category": "101", // Category ID from Taxonomy
        "score": 0.85,
        "attributes": {
          "brand": { "Apple": 0.7, "Samsung": 0.3 },
          "color": { "black": 0.6, "blue": 0.4 }
        }
      },
      {
        "category": "201", // Clothing
        "score": 0.62,
        "attributes": {
          "material": { "cotton": 0.9, "polyester": 0.1 },
          "size": { "M": 0.7, "L": 0.3 }
        }
      }
      // ... other preferences
    ],
    "updatedAt": "2024-05-20T10:00:00Z"
  }
  ```

  **Fields:**

  - `userId` (string): Tapiro's internal unique identifier for the user.
  - `preferences` (array): A list of `PreferenceItem` objects.
    - `category` (string): The category ID from the [Tapiro Taxonomy](./taxonomy.md).
    - `score` (number): A value between 0.0 and 1.0 indicating the user's interest level in this category. Higher is stronger.
    - `attributes` (object, optional): A breakdown of preferences for specific attributes within the category (e.g., preferred brands, colors, sizes). The structure may vary. Values typically represent relative preference scores (0.0-1.0).
  - `updatedAt` (string): ISO 8601 timestamp of when the preferences were last updated.

- **`401 Unauthorized`**: Invalid or missing `X-API-Key`.
- **`403 Forbidden`**: Access denied. This occurs if:
  - The user has _not_ provided `dataSharingConsent` in Tapiro.
  - The user _has_ explicitly opted out of sharing data with _your specific store_.
    **You should treat this response as "no preferences available" and avoid personalization based on Tapiro data for this user.**
- **`404 Not Found`**: The user specified by the email address (`{userId}`) does not exist in Tapiro.
- **`500 Internal Server Error`**: An unexpected error occurred on the server.

## Important Considerations

- **Consent is Key:** Always check the HTTP status code. A `403 Forbidden` response means you cannot use Tapiro preferences for that user due to their privacy settings.
- **User Identifier:** Remember to use the user's **email address** in the URL path (`{userId}`).
- **Caching:** Consider caching preference responses on your end for a reasonable duration (e.g., minutes to hours) to reduce API calls, but be mindful of the `updatedAt` timestamp if freshness is critical. Tapiro may also employ server-side caching.
- **Use Preferences:** Use the retrieved scores and attribute preferences to tailor advertising, recommendations, or other user experiences.
````
