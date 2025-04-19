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
  privacySettings?: {
    /** @default false */
    dataSharingConsent?: boolean;
    /** @default false */
    anonymizeData?: boolean;
    /** List of store IDs user has opted into */
    optInStores?: string[];
    /** List of store IDs user has opted out from */
    optOutStores?: string[];
  };
  dataAccess?: {
    /** List of allowed domains for data access */
    allowedDomains?: string[];
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
  /** User interest preferences with taxonomy categorization */
  preferences?: PreferenceItem[];
  privacySettings?: {
    dataSharingConsent?: boolean;
    anonymizeData?: boolean;
    optInStores?: string[];
    optOutStores?: string[];
  };
  dataAccess?: {
    allowedDomains?: string[];
  };
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

export interface UserData {
  /** User's email address */
  email: string;
  /** Type of data being submitted */
  dataType: "purchase" | "search";
  /** Array of data entries */
  entries: (PurchaseEntry | SearchEntry)[];
  /** Additional information about the collection event */
  metadata?: {
    /** Optional user ID if known */
    userId?: string;
    /** Source of the data (web, mobile, pos, etc) */
    source?: string;
    /** Type of device used */
    deviceType?: string;
    /** Unique identifier for the user session */
    sessionId?: string;
  };
}

export interface PurchaseEntry {
  /** @format date-time */
  timestamp: string;
  items: PurchaseItem[];
  /** @format float */
  totalAmount?: number;
}

export interface PurchaseItem {
  sku?: string;
  name: string;
  /** Category ID (e.g., "101") or name (e.g., "smartphones") */
  category: string;
  /** @default 1 */
  quantity?: number;
  /** @format float */
  price?: number;
  /** Category-specific attributes */
  attributes?: ItemAttributes;
}

/** Category-specific attributes */
export interface ItemAttributes {
  price_range?: "budget" | "mid_range" | "premium" | "luxury";
  brand?: string;
  color?: string;
  material?: string;
  style?: string;
  room?: string;
  size?: string;
  feature?: string;
  season?: string;
  gender?: string;
}

export interface SearchEntry {
  /** @format date-time */
  timestamp: string;
  query: string;
  category?: string;
  results?: number;
  clicked?: string[];
}

export interface UserPreferences {
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

export interface UserMetadataUpdate {
  /** The type of registration (user or store) */
  registrationType?: "user" | "store";
  /** Whether registration process is complete */
  registrationComplete?: boolean;
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

export interface UsageSummary {
  /** Total number of times data was submitted by stores about the user. */
  totalDataSubmissions?: number;
  /** Total number of times stores requested the user's preferences. */
  totalPreferenceRequests?: number;
  storeBreakdown?: StoreUsage[];
}

export interface StoreUsage {
  storeId?: string;
  storeName?: string;
  /** Number of data submissions from this store. */
  dataSubmissions?: number;
  /** Number of preference requests from this store. */
  preferenceRequests?: number;
}

export interface SpendingAnalytics {
  /**
   * Total amount spent across all categories.
   * @format float
   */
  totalSpent?: number;
  categoryBreakdown?: CategorySpending[];
}

export interface CategorySpending {
  /** Top-level category ID from taxonomy. */
  categoryId?: string;
  /** Top-level category name from taxonomy. */
  categoryName?: string;
  /**
   * Total amount spent in this category.
   * @format float
   */
  totalAmount?: number;
  /** Number of items purchased in this category. */
  itemCount?: number;
}

export interface RecentDataEntry {
  /** The ID of the userData document. */
  entryId?: string;
  storeId?: string;
  storeName?: string;
  dataType?: "purchase" | "search";
  /** @format date-time */
  timestamp?: string;
  /** A brief summary, e.g., "Purchase of 3 items" or "Search for 'laptop'". */
  summary?: string;
}

export interface ConsentingStore {
  storeId?: string;
  name?: string;
  /** @format date-time */
  optInDate?: string;
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

export interface GetRecentDataParams {
  /**
   * Maximum number of recent entries to return.
   * @min 1
   * @max 50
   * @default 10
   */
  limit?: number;
}
