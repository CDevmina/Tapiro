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

import {
  Error,
  GetRecentUserDataParams,
  GetSpendingAnalyticsParams,
  MonthlySpendingAnalytics,
  RecentUserDataEntry,
  StoreConsentList,
  User,
  UserCreate,
  UserData,
  UserMetadataResponse,
  UserPreferences,
  UserPreferencesUpdate,
  UserUpdate,
} from "./data-contracts";
import { ContentType, HttpClient, RequestParams } from "./http-client";

export class Users<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * @description Create a new regular user account
   *
   * @tags Authentication
   * @name RegisterUser
   * @summary Register User
   * @request POST:/users/register
   * @secure
   * @response `201` `User` User created successfully
   * @response `400` `Error`
   * @response `401` `Error`
   * @response `409` `Error`
   * @response `500` `Error`
   */
  registerUser = (data: UserCreate, params: RequestParams = {}) =>
    this.request<User, Error>({
      path: `/users/register`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Get authenticated user's profile
   *
   * @tags User Management
   * @name GetUserProfile
   * @summary Get User Profile
   * @request GET:/users/profile
   * @secure
   * @response `200` `User` User profile retrieved successfully
   * @response `401` `Error`
   * @response `404` `Error`
   * @response `500` `Error`
   */
  getUserProfile = (params: RequestParams = {}) =>
    this.request<User, Error>({
      path: `/users/profile`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Update authenticated user's profile
   *
   * @tags User Management
   * @name UpdateUserProfile
   * @summary Update User Profile
   * @request PUT:/users/profile
   * @secure
   * @response `200` `User` User profile updated successfully
   * @response `401` `Error`
   * @response `404` `Error`
   * @response `500` `Error`
   */
  updateUserProfile = (data: UserUpdate, params: RequestParams = {}) =>
    this.request<User, Error>({
      path: `/users/profile`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Delete authenticated user's profile
   *
   * @tags User Management
   * @name DeleteUserProfile
   * @summary Delete User Profile
   * @request DELETE:/users/profile
   * @secure
   * @response `204` `void` User profile deleted successfully
   * @response `401` `Error`
   * @response `404` `Error`
   * @response `500` `Error`
   */
  deleteUserProfile = (params: RequestParams = {}) =>
    this.request<void, Error>({
      path: `/users/profile`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * @description Submit purchase/search history for a user (authenticated via API key)
   *
   * @tags Data Collection
   * @name SubmitUserData
   * @summary Submit user data
   * @request POST:/users/data
   * @secure
   * @response `202` `void` Data accepted for processing
   * @response `400` `Error`
   * @response `401` `Error`
   * @response `500` `Error`
   */
  submitUserData = (data: UserData, params: RequestParams = {}) =>
    this.request<void, Error>({
      path: `/users/data`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      ...params,
    });
  /**
   * @description Retrieve preferences for targeted advertising
   *
   * @tags Data Retrival
   * @name GetUserPreferences
   * @summary Get user preferences
   * @request GET:/users/{userId}/preferences
   * @secure
   * @response `200` `UserPreferences` UserPreferences retrieved
   * @response `401` `Error`
   * @response `403` `Error`
   * @response `404` `Error`
   * @response `500` `Error`
   */
  getUserPreferences = (userId: string, params: RequestParams = {}) =>
    this.request<UserPreferences, Error>({
      path: `/users/${userId}/preferences`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Get the authenticated user's preferences
   *
   * @tags Preference Management
   * @name GetUserOwnPreferences
   * @summary Get user preferences
   * @request GET:/users/preferences
   * @secure
   * @response `200` `UserPreferences` User preferences retrieved successfully
   * @response `401` `Error`
   * @response `404` `Error`
   * @response `500` `Error`
   */
  getUserOwnPreferences = (params: RequestParams = {}) =>
    this.request<UserPreferences, Error>({
      path: `/users/preferences`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Update the user's interest preferences and related settings
   *
   * @tags Preference Management
   * @name UpdateUserPreferences
   * @summary Update user preferences
   * @request PUT:/users/preferences
   * @secure
   * @response `200` `UserPreferences` Preferences updated successfully
   * @response `400` `Error`
   * @response `401` `Error`
   * @response `500` `Error`
   */
  updateUserPreferences = (
    data: UserPreferencesUpdate,
    params: RequestParams = {},
  ) =>
    this.request<UserPreferences, Error>({
      path: `/users/preferences`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Removes a store from the user's opt-out list to allow data collection
   *
   * @tags Preference Management
   * @name OptInToStore
   * @summary Opt in to store data collection
   * @request POST:/users/preferences/opt-in/{storeId}
   * @secure
   * @response `204` `void` Successfully opted in to store
   * @response `401` `Error`
   * @response `404` `Error`
   * @response `500` `Error`
   */
  optInToStore = (storeId: string, params: RequestParams = {}) =>
    this.request<void, Error>({
      path: `/users/preferences/opt-in/${storeId}`,
      method: "POST",
      secure: true,
      ...params,
    });
  /**
   * @description Adds a store to the user's opt-out list to prevent data collection
   *
   * @tags Preference Management
   * @name OptOutFromStore
   * @summary Opt out from store data collection
   * @request POST:/users/preferences/opt-out/{storeId}
   * @secure
   * @response `204` `void` Successfully opted out from store
   * @response `401` `Error`
   * @response `404` `Error`
   * @response `500` `Error`
   */
  optOutFromStore = (storeId: string, params: RequestParams = {}) =>
    this.request<void, Error>({
      path: `/users/preferences/opt-out/${storeId}`,
      method: "POST",
      secure: true,
      ...params,
    });
  /**
   * @description Retrieves the lists of store IDs the user has explicitly opted into or opted out of sharing data with.
   *
   * @tags Preference Management
   * @name GetStoreConsentLists
   * @summary Get user's store opt-in/out lists
   * @request GET:/users/preferences/store-consent
   * @secure
   * @response `200` `StoreConsentList` Successfully retrieved store consent lists.
   * @response `401` `Error`
   * @response `404` `Error`
   * @response `500` `Error`
   */
  getStoreConsentLists = (params: RequestParams = {}) =>
    this.request<StoreConsentList, Error>({
      path: `/users/preferences/store-consent`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Retrieve Auth0 metadata for the authenticated user
   *
   * @tags Authentication
   * @name GetUserMetadata
   * @summary Get User Metadata
   * @request GET:/users/metadata/get
   * @secure
   * @response `200` `UserMetadataResponse` Metadata retrieved successfully
   * @response `401` `Error`
   * @response `500` `Error`
   */
  getUserMetadata = (params: RequestParams = {}) =>
    this.request<UserMetadataResponse, Error>({
      path: `/users/metadata/get`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Retrieves a list of recent data submissions made about the authenticated user.
   *
   * @tags User Management
   * @name GetRecentUserData
   * @summary Get Recent User Data Submissions
   * @request GET:/users/data/recent
   * @secure
   * @response `200` `(RecentUserDataEntry)[]` Recent data submissions retrieved successfully
   * @response `401` `Error`
   * @response `500` `Error`
   */
  getRecentUserData = (
    query: GetRecentUserDataParams,
    params: RequestParams = {},
  ) =>
    this.request<RecentUserDataEntry[], Error>({
      path: `/users/data/recent`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Retrieves aggregated spending data by category and month for the authenticated user.
   *
   * @tags User Management
   * @name GetSpendingAnalytics
   * @summary Get User Spending Analytics
   * @request GET:/users/analytics/spending
   * @secure
   * @response `200` `MonthlySpendingAnalytics` Spending analytics retrieved successfully.
   * @response `401` `Error`
   * @response `404` `Error`
   * @response `500` `Error`
   */
  getSpendingAnalytics = (
    query: GetSpendingAnalyticsParams,
    params: RequestParams = {},
  ) =>
    this.request<MonthlySpendingAnalytics, Error>({
      path: `/users/analytics/spending`,
      method: "GET",
      query: query,
      secure: true,
      format: "json",
      ...params,
    });
}
