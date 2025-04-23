/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
/*
 * ---------------------------------------------------------------
 * ## THIS FILE WAS GENERATED VIA SWAGGER-TYPESCRIPT-API        ##
 * ##                                                           ##
 * ## AUTHOR: acacode                                           ##
 * ## SOURCE: https://github.com/acacode/swagger-typescript-api ##
 * ---------------------------------------------------------------
 */

/** Distribution of attribute values (0.0-1.0) */
export type AttributeDistribution = Record<string, number>;

export interface User {
  /** Internal user ID */
  userId?: string;
  /** Auth0 user ID */
  auth0Id: string;
  /** @format email */
  email: string;
  /**
   * @minLength 3
   * @maxLength 15
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  username?: string;
  /** @pattern ^\+?[\d\s-]+$ */
  phone?: string;
  /**
   * User gender identity (e.g., 'male', 'female', 'non-binary', 'prefer_not_to_say')
   * @example "female"
   */
  gender?: string | null;
  /**
   * User income bracket category (e.g., '<25k', '25k-50k', '50k-100k', '100k-200k', '>200k', 'prefer_not_to_say')
   * @example "50k-100k"
   */
  incomeBracket?: string | null;
  /**
   * User country of residence (ISO 3166-1 alpha-2 code)
   * @example "US"
   */
  country?: string | null;
  /**
   * User age
   * @format int32
   * @example 35
   */
  age?: number | null;
  privacySettings: {
    /** @default false */
    dataSharingConsent?: boolean;
    /** @default false */
    anonymizeData?: boolean;
    /** List of store IDs user has opted into */
    optInStores?: string[];
    /** List of store IDs user has opted out from */
    optOutStores?: string[];
  };
  /** @format date-time */
  createdAt?: string;
  /** @format date-time */
  updatedAt?: string;
}

export interface Store {
  storeId?: string;
  /** Auth0 organization ID */
  auth0Id: string;
  name: string;
  address: string;
  /** Hashed API keys */
  apiKeys?: string[];
  webhooks?: {
    /** @format uri */
    url: string;
    events: ("purchase" | "opt-out")[];
  }[];
  /** @format date-time */
  createdAt?: string;
  /** @format date-time */
  updatedAt?: string;
}

export interface UserCreate {
  preferences?: PreferenceItem[];
  /** User's consent for data sharing */
  dataSharingConsent: boolean;
  /** User gender identity */
  gender?: string | null;
  /** User income bracket category */
  incomeBracket?: string | null;
  /** User country of residence (ISO 3166-1 alpha-2 code) */
  country?: string | null;
  /**
   * User age
   * @format int32
   */
  age?: number | null;
}

export interface StoreCreate {
  name: string;
  address: string;
  webhooks?: {
    /** @format uri */
    url?: string;
    events?: ("purchase" | "opt-out")[];
  }[];
}

export interface UserUpdate {
  /** User's unique username */
  username?: string;
  /** User's phone number (E.164 format recommended) */
  phone?: string;
  /** User interest preferences with taxonomy categorization */
  preferences?: PreferenceItem[];
  privacySettings?: {
    dataSharingConsent?: boolean;
    anonymizeData?: boolean;
    optInStores?: string[];
    optOutStores?: string[];
  };
  /** User gender identity */
  gender?: string | null;
  /** User income bracket category */
  incomeBracket?: string | null;
  /** User country of residence (ISO 3166-1 alpha-2 code) */
  country?: string | null;
  /**
   * User age
   * @format int32
   */
  age?: number | null;
}

export interface ApiKey {
  /** @format uuid */
  keyId?: string;
  prefix?: string;
  /** Name for the API key */
  name?: string;
  /** @format date-time */
  createdAt?: string;
  status?: "active" | "revoked";
}

/** @example {"email":"user@example.com","dataType":"purchase","entries":[{"$ref":"#/components/schemas/PurchaseEntry/example"}],"metadata":{"source":"web","deviceType":"desktop","sessionId":"abc-123-xyz-789"}} */
export interface UserData {
  /**
   * User's email address (used as identifier for API key auth). Must match a registered Tapiro user.
   * @format email
   */
  email: string;
  /** Specifies the type of data contained in the 'entries' array. */
  dataType: "purchase" | "search";
  /**
   * List of data entries. Each entry must conform to either the PurchaseEntry or SearchEntry schema, matching the top-level 'dataType'.
   * @minItems 1
   */
  entries: (PurchaseEntry | SearchEntry)[];
  /**
   * Additional metadata about the collection event (e.g., source, device).
   * @example {"source":"web","deviceType":"desktop","sessionId":"abc-123-xyz-789"}
   */
  metadata?: {
    /** Source of the data (e.g., 'web', 'mobile_app', 'pos'). */
    source?: string;
    /** Type of device used (e.g., 'desktop', 'mobile', 'tablet'). */
    deviceType?: string;
    /** Identifier for the user's session. */
    sessionId?: string;
  };
}

/** @example {"timestamp":"2024-05-15T14:30:00Z","items":[{"$ref":"#/components/schemas/PurchaseItem/example"},{"sku":"ABC-789","name":"Running Shorts","category":"201","price":39.95,"quantity":1,"attributes":{"color":"black","size":"M","material":"polyester"}}],"totalValue":91.93} */
export interface PurchaseEntry {
  /**
   * ISO 8601 timestamp of when the purchase occurred.
   * @format date-time
   */
  timestamp: string;
  /** List of items included in the purchase. */
  items: PurchaseItem[];
  /**
   * Optional total value of the purchase event.
   * @format float
   */
  totalValue?: number;
}

/** @example {"sku":"XYZ-123","name":"Men's Cotton T-Shirt","category":"201","price":25.99,"quantity":2,"attributes":{"color":"navy","size":"M","material":"cotton"}} */
export interface PurchaseItem {
  /** Stock Keeping Unit or unique product identifier. */
  sku?: string;
  /** Name of the purchased item. */
  name: string;
  /** Category ID or name matching the Tapiro taxonomy (e.g., "101" or "Smartphones"). Providing the most specific category ID is recommended. */
  category: string;
  /**
   * Price of a single unit of the item.
   * @format float
   */
  price?: number;
  /**
   * Number of units purchased.
   * @default 1
   */
  quantity?: number;
  /** Key-value pairs representing product attributes based on the taxonomy. Keys should be attribute names (e.g., "color", "size", "brand") and values should be the specific attribute value (e.g., "blue", "large", "Acme"). */
  attributes?: ItemAttributes;
}

/**
 * Key-value pairs representing product attributes based on the taxonomy. Keys should be attribute names (e.g., "color", "size", "brand") and values should be the specific attribute value (e.g., "blue", "large", "Acme").
 * @example {"color":"blue","size":"L","material":"cotton"}
 */
export type ItemAttributes = Record<string, string>;

/** @example {"timestamp":"2024-05-15T10:15:00Z","query":"noise cancelling headphones","category":"105","results":25,"clicked":["Bose-QC45","Sony-WH1000XM5"]} */
export interface SearchEntry {
  /**
   * ISO 8601 timestamp of when the search occurred.
   * @format date-time
   */
  timestamp: string;
  /** The search query string entered by the user. */
  query: string;
  /** Optional category context provided during the search (e.g., user was browsing 'Electronics'). Should match a Tapiro taxonomy ID or name. */
  category?: string;
  /** Optional number of results returned for the search query. */
  results?: number;
  /** Optional list of product IDs or SKUs clicked from the search results. */
  clicked?: string[];
}

export interface UserPreferences {
  /** Internal user ID */
  userId?: string;
  preferences?: PreferenceItem[];
  /** @format date-time */
  updatedAt?: string;
}

export interface UserPreferencesUpdate {
  /** User interest preferences with taxonomy categorization */
  preferences: PreferenceItem[];
}

export interface PreferenceItem {
  /**
   * The ID of the taxonomy category.
   * @example "102"
   */
  category: string;
  /**
   * The user's interest score for this category (e.g., 0-1).
   * @format float
   * @example 0.85
   */
  score: number;
  /**
   * Specific attribute preferences within this category (key-value pairs). Values should align with taxonomy definitions.
   * @example {"brand":"Apple","screen_size":"13-inch","usage_type":"Work"}
   */
  attributes?: Record<string, string>;
}

export interface StoreUpdate {
  name?: string;
  address?: string;
  webhooks?: {
    /** @format uri */
    url?: string;
    events?: ("purchase" | "opt-out")[];
  }[];
}

export interface ApiKeyCreate {
  /** Name for the API key */
  name?: string;
}

export type ApiKeyList = ApiKey[];

export interface ApiKeyUsage {
  keyId?: string;
  prefix?: string;
  name?: string;
  totalRequests?: number;
  methodBreakdown?: Record<string, number>;
  endpointBreakdown?: Record<string, number>;
  dailyUsage?: {
    /** @format date */
    date?: string;
    count?: number;
  }[];
}

export interface StoreConsentList {
  /** List of store IDs the user has opted into. */
  optInStores?: string[];
  /** List of store IDs the user has opted out of. */
  optOutStores?: string[];
}

export interface HealthStatus {
  /** Overall health status of the Health */
  status?: "healthy" | "degraded" | "unhealthy";
  /**
   * Time of health check
   * @format date-time
   */
  timestamp?: string;
  /** Service name */
  service?: string;
  dependencies?: {
    database?: "connected" | "disconnected" | "degraded";
    cache?: "connected" | "disconnected" | "degraded";
    auth?: "connected" | "disconnected" | "degraded" | "unknown";
  };
}

export interface Error {
  /**
   * HTTP status code
   * @format int32
   */
  code: number;
  /** Error message */
  message: string;
  /** Additional error details if available */
  details?: string;
}

export interface PingStatus {
  status?: "ok";
  /** @format date-time */
  timestamp?: string;
}

export interface UserMetadataResponse {
  /** Whether metadata was updated successfully */
  updated?: boolean;
  /** User metadata from Auth0 */
  metadata?: {
    /** The type of registration */
    registrationType?: "user" | "store";
    /** Whether registration process is complete */
    registrationComplete?: boolean;
  };
}

/** Attribute within a taxonomy category */
export interface TaxonomyAttribute {
  name: string;
  values: string[];
  description?: string | null;
}

/** Category within a taxonomy system */
export interface TaxonomyCategory {
  id: string;
  name: string;
  parent_id?: string | null;
  description?: string | null;
  /** @default [] */
  attributes?: TaxonomyAttribute[];
}

/** Complete taxonomy definition with categories and version */
export interface Taxonomy {
  _id?: string;
  categories: TaxonomyCategory[];
  version: string;
}

export interface RecentUserDataEntry {
  /**
   * Unique identifier for the activity entry.
   * @format objectId
   */
  _id: string;
  /** The type of data activity. */
  dataType: "purchase" | "search";
  /**
   * Timestamp of the original event or submission.
   * @format date-time
   */
  timestamp: string;
  /**
   * ID of the store associated with the activity.
   * @format objectId
   */
  storeId: string;
  /**
   * Name of the store (looked up).
   * @example "Awesome Gadgets Inc."
   */
  storeName: string;
  /** Specific details based on the dataType. */
  details: {
    items?: {
      /** @example "Wireless Mouse" */
      name?: string;
      /**
       * Taxonomy category ID.
       * @example "100"
       */
      category?: string;
      /**
       * @format float
       * @example 25.99
       */
      price?: number;
      /** @example 1 */
      quantity?: number;
    }[];
    /**
     * Total amount for the purchase event.
     * @format float
     * @example 25.99
     */
    totalAmount?: number;
    /** @example "best gaming laptop" */
    searchTerm?: string;
    /**
     * Taxonomy category ID searched within, if applicable.
     * @example "102"
     */
    categorySearched?: string;
  };
}

/**
 * Aggregated spending data per category over time. The structure might vary based on implementation (e.g., object keyed by month/year, or an array of objects each representing a time point).
 * @example {"2025-01":{"Electronics":1299.99,"Clothing":150.5},"2025-02":{"Clothing":100,"Home":85}}
 */
export type SpendingAnalytics = Record<string, Record<string, number>>;

export interface StoreBasicInfo {
  /** The unique ID of the store. */
  storeId: string;
  /** The name of the store. */
  name: string;
}

/** @example {"month":"2024-01","spending":{"Electronics":1299.99,"Clothing":150.5}} */
export interface MonthlySpendingItem {
  /**
   * The month of the spending data (e.g., "2024-01").
   * @format date
   */
  month: string;
  /** An object mapping category names to the total amount spent in that category for the month. */
  spending: Record<string, number>;
}

/** An array of monthly spending breakdowns. */
export type MonthlySpendingAnalytics = MonthlySpendingItem[];

export interface GetApiKeyUsagePayload {
  /**
   * Optional start date for filtering usage data
   * @format date
   */
  startDate?: string;
  /**
   * Optional end date for filtering usage data
   * @format date
   */
  endDate?: string;
}

export interface GetRecentUserDataParams {
  /**
   * Maximum number of entries per page.
   * @format int32
   * @default 15
   */
  limit?: number;
  /**
   * Page number for pagination.
   * @format int32
   * @default 1
   */
  page?: number;
  /**
   * Filter activity from this date onwards (YYYY-MM-DD).
   * @format date
   */
  startDate?: string;
  /**
   * Filter activity up to this date (YYYY-MM-DD).
   * @format date
   */
  endDate?: string;
  /** Filter by the type of data submission. */
  dataType?: "purchase" | "search";
  /**
   * Filter activity related to a specific store ID.
   * @format objectId
   */
  storeId?: string;
  /** Search term for activity details (e.g., item name, search query). */
  search?: string;
}

export interface GetSpendingAnalyticsParams {
  /**
   * Filter results from this date onwards (YYYY-MM-DD).
   * @format date
   */
  startDate?: string;
  /**
   * Filter results up to this date (YYYY-MM-DD).
   * @format date
   */
  endDate?: string;
}

export interface LookupStoresParams {
  /** Comma-separated list of store IDs to lookup. */
  ids: string;
}

export interface ListStoresForUserDiscoveryParams {
  /** Optional search term to filter stores by name. */
  search?: string;
  /**
   * Maximum number of stores to return per page.
   * @format int32
   * @default 20
   */
  limit?: number;
  /**
   * Page number for pagination.
   * @format int32
   * @default 1
   */
  page?: number;
}
