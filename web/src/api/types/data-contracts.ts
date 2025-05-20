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
  privacySettings: PrivacySettings;
  /** User-provided and inferred demographic information */
  demographicData?: DemographicData;
  /** @format date-time */
  createdAt?: string;
  /** @format date-time */
  updatedAt?: string;
}

export interface PrivacySettings {
  /** User consent to share aggregated/anonymized data. */
  dataSharingConsent: boolean;
  /**
   * Allow Tapiro to infer demographic data based on user activity.
   * @default true
   */
  allowInference?: boolean;
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
  /**
   * User's unique username, chosen during registration.
   * @minLength 3
   * @maxLength 15
   * @pattern ^[a-zA-Z0-9_-]+$
   */
  username: string;
  preferences?: PreferenceItem[];
  /** User's consent for data sharing */
  dataSharingConsent: boolean;
  /** Allow Tapiro to infer demographic data (defaults to true if omitted). */
  allowInference?: boolean;
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
  /**
   * User's phone number (E.164 format recommended)
   * @pattern ^\+?[\d\s-]+$
   */
  phone?: string;
  /** User interest preferences with taxonomy categorization */
  preferences?: PreferenceItem[];
  privacySettings?: PrivacySettings;
  /** Updatable user-provided demographic information. Setting a value here implies verification and may clear inferred values. */
  demographicData?: {
    /** User-provided gender identity */
    gender?: "male" | "female" | "non-binary" | "prefer_not_to_say" | null;
    /** User-provided income bracket category */
    incomeBracket?:
      | "<25k"
      | "25k-50k"
      | "50k-100k"
      | "100k-200k"
      | ">200k"
      | "prefer_not_to_say"
      | null;
    /** User-provided country of residence (e.g., ISO 3166-1 alpha-2 code) */
    country?: string | null;
    /**
     * User-provided age. Setting this clears the inferred age bracket.
     * @format int32
     * @min 0
     */
    age?: number | null;
    /** User-provided: Does the user have children? */
    hasKids?: boolean | null;
    /** User-provided: User relationship status */
    relationshipStatus?:
      | "single"
      | "relationship"
      | "married"
      | "prefer_not_to_say"
      | null;
    /** User-provided: User employment status */
    employmentStatus?:
      | "employed"
      | "unemployed"
      | "student"
      | "prefer_not_to_say"
      | null;
    /** User-provided: User education level */
    educationLevel?:
      | "high_school"
      | "bachelors"
      | "masters"
      | "doctorate"
      | "prefer_not_to_say"
      | null;
  };
}

export interface ApiKey {
  /** @format uuid */
  keyId: string;
  prefix: string;
  /** Name for the API key */
  name: string;
  /** @format date-time */
  createdAt: string;
  status: "active" | "revoked";
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
  preferences?: PreferenceItem[];
}

export interface PreferenceItem {
  /** Category ID or name (e.g., "101" or "smartphones") */
  category: string;
  /**
   * Preference score (0.0-1.0)
   * @format float
   * @min 0
   * @max 1
   */
  score: number;
  /** Category-specific attribute preferences */
  attributes?: {
    price_range?: {
      /** @format float */
      budget?: number;
      /** @format float */
      mid_range?: number;
      /** @format float */
      premium?: number;
      /** @format float */
      luxury?: number;
    };
    /** Distribution of attribute values (0.0-1.0) */
    color?: AttributeDistribution;
    /** Distribution of attribute values (0.0-1.0) */
    brand?: AttributeDistribution;
    /** Distribution of attribute values (0.0-1.0) */
    material?: AttributeDistribution;
    /** Distribution of attribute values (0.0-1.0) */
    style?: AttributeDistribution;
    /** Distribution of attribute values (0.0-1.0) */
    room?: AttributeDistribution;
    /** Distribution of attribute values (0.0-1.0) */
    size?: AttributeDistribution;
    /** Distribution of attribute values (0.0-1.0) */
    feature?: AttributeDistribution;
    /** Distribution of attribute values (0.0-1.0) */
    season?: AttributeDistribution;
    /** Distribution of attribute values (0.0-1.0) */
    gender?: AttributeDistribution;
  };
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
  /**
   * Name for the API key
   * @minLength 1
   */
  name: string;
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
  metadata?: {
    /** The type of registration */
    registrationType?: "user" | "store";
    /** Whether registration process is complete */
    registrationComplete?: boolean;
    /** User or store display name */
    nickname?: string;
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

/** User-provided and inferred demographic information */
export interface DemographicData {
  /**
   * User-provided gender identity
   * @example "female"
   */
  gender?: "male" | "female" | "non-binary" | "prefer_not_to_say" | null;
  /**
   * User-provided income bracket category
   * @example "50k-100k"
   */
  incomeBracket?:
    | "<25k"
    | "25k-50k"
    | "50k-100k"
    | "100k-200k"
    | ">200k"
    | "prefer_not_to_say"
    | null;
  /**
   * User-provided country of residence (e.g., ISO 3166-1 alpha-2 code)
   * @example "US"
   */
  country?: string | null;
  /**
   * User-provided age
   * @format int32
   * @min 0
   * @example 35
   */
  age?: number | null;
  /**
   * User-provided: Does the user have children?
   * @example true
   */
  hasKids?: boolean | null;
  /**
   * User-provided: User relationship status
   * @example "married"
   */
  relationshipStatus?:
    | "single"
    | "relationship"
    | "married"
    | "prefer_not_to_say"
    | null;
  /**
   * User-provided: User employment status
   * @example "employed"
   */
  employmentStatus?:
    | "employed"
    | "unemployed"
    | "student"
    | "prefer_not_to_say"
    | null;
  /**
   * User-provided: User education level
   * @example "bachelors"
   */
  educationLevel?:
    | "high_school"
    | "bachelors"
    | "masters"
    | "doctorate"
    | "prefer_not_to_say"
    | null;
  /** Inferred: Does the user likely have children? (null if unknown or user provided) */
  inferredHasKids?: boolean | null;
  /** Inferred: User relationship status (null if unknown or user provided) */
  inferredRelationshipStatus?: "single" | "relationship" | "married" | null;
  /** Inferred: User employment status (null if unknown or user provided) */
  inferredEmploymentStatus?: "employed" | "unemployed" | "student" | null;
  /** Inferred: User education level (null if unknown or user provided) */
  inferredEducationLevel?:
    | "high_school"
    | "bachelors"
    | "masters"
    | "doctorate"
    | null;
  /** Inferred: User gender identity (null if unknown or user provided) */
  inferredGender?: "male" | "female" | "non-binary" | null;
}

export interface PurchaseItem {
  /** Stock Keeping Unit or unique product identifier. */
  sku?: string;
  /** Name of the purchased item. */
  name: string;
  /** Category ID or name matching the taxonomy. */
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
  /** Key-value pairs representing product attributes. */
  attributes?: Record<string, any>;
}

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
  totalValue?: number | null;
}

export interface SearchEntry {
  /**
   * ISO 8601 timestamp of when the search occurred.
   * @format date-time
   */
  timestamp: string;
  /** The search query string entered by the user. */
  query: string;
  /** Optional category context provided during the search. */
  category?: string | null;
  /** Optional number of results returned for the search query. */
  results?: number | null;
  /** Optional list of product IDs or SKUs clicked from the search results. */
  clicked?: string[] | null;
}

export interface RecentUserDataEntry {
  /** The unique ID of the userData entry. */
  _id?: string;
  /** The ID of the store that submitted the data. */
  storeId?: string;
  /** The type of data submitted. */
  dataType?: "purchase" | "search";
  /**
   * When the data was submitted to Tapiro.
   * @format date-time
   */
  timestamp?: string;
  /**
   * The timestamp of the original event (e.g., purchase time).
   * @format date-time
   */
  entryTimestamp?: string;
  /** Array of individual purchase or search events within this batch. */
  details?: (PurchaseEntry | SearchEntry)[];
}

export interface StoreBasicInfo {
  /** The unique ID of the store. */
  storeId: string;
  /** The name of the store. */
  name: string;
}

/** @example {"month":"2024-01","spending":{"Electronics":1299.99,"Clothing":150.5}} */
export interface MonthlySpendingItem {
  /** The month of the spending data (e.g., "2024-01"). */
  month: string;
  /** An object mapping category names to the total amount spent in that category for the month. */
  spending: Record<string, number>;
}

/** An array of monthly spending breakdowns. */
export type MonthlySpendingAnalytics = MonthlySpendingItem[];

export interface ApiUsageLogEntry {
  /** The unique ID of the log entry. */
  _id?: string;
  /** The ID of the store associated with the API key. */
  storeId?: string;
  /** The ID of the API key used. */
  apiKeyId?: string;
  /** The prefix of the API key used. */
  apiKeyPrefix?: string;
  /** The API endpoint accessed. */
  endpoint?: string;
  /** The HTTP method used. */
  method?: string;
  /**
   * The timestamp when the request occurred.
   * @format date-time
   */
  timestamp?: string;
  /** The user agent of the client making the request. */
  userAgent?: string;
}

export interface PaginationInfo {
  /** The current page number. */
  currentPage?: number;
  /** The total number of pages available. */
  totalPages?: number;
  /** The total number of items matching the query. */
  totalItems?: number;
  /** The number of items per page. */
  limit?: number;
}

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

export interface GetApiUsageLogParams {
  /** Filter logs by a specific API key ID. */
  keyId?: string;
  /**
   * Filter logs from this date (inclusive).
   * @format date
   */
  startDate?: string;
  /**
   * Filter logs up to this date (inclusive).
   * @format date
   */
  endDate?: string;
  /**
   * Page number for pagination.
   * @default 1
   */
  page?: number;
  /**
   * Number of logs per page.
   * @default 15
   */
  limit?: number;
}

export interface GetRecentUserDataParams {
  /**
   * Maximum number of records to return
   * @default 10
   */
  limit?: number;
  /**
   * Page number for pagination
   * @default 1
   */
  page?: number;
  /** Filter by data type (purchase or search) */
  dataType?: "purchase" | "search";
  /** Filter by store ID */
  storeId?: string;
  /**
   * Filter by start date (ISO 8601 format YYYY-MM-DD)
   * @format date
   */
  startDate?: string;
  /**
   * Filter by end date (ISO 8601 format YYYY-MM-DD)
   * @format date
   */
  endDate?: string;
  /** Search term for entries (e.g., item name, search query) */
  searchTerm?: string;
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

export interface SearchStoresParams {
  /**
   * The search term to look for in store names.
   * @minLength 2
   */
  query: string;
  /**
   * Maximum number of results to return.
   * @default 10
   */
  limit?: number;
}
