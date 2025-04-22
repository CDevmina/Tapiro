# Tapiro Store API Documentation

Welcome to the Tapiro Store API! This documentation provides everything you need to integrate your store's systems with Tapiro to leverage AI-driven personalized advertising and insights.

By integrating with Tapiro, you can:

- Submit user interaction data (purchases, searches) for analysis.
- Retrieve processed user preferences to personalize user experiences (e.g., targeted ads, product recommendations).

## Getting Started

1.  **Obtain an API Key:** Generate API keys from your Store Dashboard within the Tapiro web application. Keep these keys secure.
2.  **Authentication:** All API requests must be authenticated using your API key. See the [Authentication Guide](./authentication.md).
3.  **Understand Endpoints:** Familiarize yourself with the primary endpoints for stores:
    - [Data Submission](./data_submission.md): Send user purchase and search data.
    - [Preference Retrieval](./preference_retrieval.md): Get user preferences.
4.  **Review the Taxonomy:** Accurate data categorization is crucial for effective personalization. Understand how to use the [Tapiro Taxonomy](./taxonomy.md).
5.  **Error Handling:** Be prepared to handle potential API errors. Refer to the [Error Handling Guide](./error_handling.md).

## Core Concepts

- **API Key:** Your unique secret key authenticates your store's requests. It identifies your store to Tapiro.
- **User Identification:** Users are primarily identified by their **email address** when submitting data or retrieving preferences via the API. This email _must_ correspond to a registered user within the Tapiro ecosystem.
- **Consent:** Tapiro respects user privacy choices. Data submission will only be processed if the user has given `dataSharingConsent` within Tapiro _and_ has not explicitly opted out of sharing data with _your specific store_. Preference retrieval will fail (403 Forbidden) if consent is not granted for your store.
- **Taxonomy:** A hierarchical system for categorizing products and interests. Using correct category IDs or names from the taxonomy when submitting data is essential for the AI models.

## API Base URL

The base URL for the production API is: `https://api.tapiro.com/v1`
_(Note: Use the appropriate URL provided for development or staging environments.)_

## Need Help?

If you encounter issues or have questions, please contact Tapiro Support at `tapirosupport@gmail.com`.
