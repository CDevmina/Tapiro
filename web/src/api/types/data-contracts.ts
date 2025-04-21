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

export interface StoreConsentDetail {
  /**
   * The unique identifier for the store.
   * @example "60d5ecb8b48f4d001f9e8f8a"
   */
  storeId: string;
  /**
   * The name of the store.
   * @example "Example Electronics Store"
   */
  name: string;
}

export interface StoreConsentList {
  /** List of stores the user has opted into sharing data with. */
  optInStores: StoreConsentDetail[];
  /** List of stores the user has opted out of sharing data with. */
  optOutStores: StoreConsentDetail[];
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

export interface ActivityByStore {
  /** The unique identifier for the store. */
  storeId: string;
  /** The name of the store. */
  name: string;
  /** The number of activities associated with this store. */
  count: number;
}

export interface UserActivitySummary {
  recentApiUsage: {
    /** Total number of API calls accessing the user's data recently. */
    total?: number;
    /** Breakdown of API calls by store. */
    byStore?: ActivityByStore[];
  };
  recentSubmissions: {
    /** Total number of data submissions made about the user recently. */
    total?: number;
    /** Breakdown of data submissions by store. */
    byStore?: ActivityByStore[];
  };
}

export interface SpendingBreakdownItem {
  /** The ID of the spending category from the taxonomy. */
  categoryId: string;
  /** The name of the spending category. */
  categoryName: string;
  /**
   * The total amount spent in this category.
   * @format double
   */
  totalSpent: number;
}

export interface SpendingAnalyticsResponse {
  /** The user's unique identifier. */
  userId: string;
  /**
   * Description of the time period covered (e.g., "Last 30 days").
   * @example "All Time"
   */
  timeframe: string;
  spendingBreakdown: SpendingBreakdownItem[];
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
