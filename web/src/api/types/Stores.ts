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
  ApiKey,
  ApiKeyCreate,
  ApiKeyList,
  ApiKeyUsage,
  Error,
  GetApiKeyUsagePayload,
  Store,
  StoreCreate,
  StoreUpdate,
} from "./data-contracts";
import { ContentType, HttpClient, RequestParams } from "./http-client";

export class Stores<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * @description Create a new store account
   *
   * @tags Authentication
   * @name RegisterStore
   * @summary Register Store
   * @request POST:/stores/register
   * @secure
   * @response `201` `Store` Store created successfully
   * @response `400` `Error`
   * @response `401` `Error`
   * @response `409` `Error`
   * @response `500` `Error`
   */
  registerStore = (data: StoreCreate, params: RequestParams = {}) =>
    this.request<Store, Error>({
      path: `/stores/register`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Get authenticated store's profile
   *
   * @tags Store Management
   * @name GetStoreProfile
   * @summary Get Store Profile
   * @request GET:/stores/profile
   * @secure
   * @response `200` `Store` Store profile retrieved successfully
   * @response `401` `Error`
   * @response `404` `Error`
   * @response `500` `Error`
   */
  getStoreProfile = (params: RequestParams = {}) =>
    this.request<Store, Error>({
      path: `/stores/profile`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Update authenticated store's profile
   *
   * @tags Store Management
   * @name UpdateStoreProfile
   * @summary Update Store Profile
   * @request PUT:/stores/profile
   * @secure
   * @response `200` `Store` Store profile updated successfully
   * @response `400` `Error`
   * @response `401` `Error`
   * @response `404` `Error`
   * @response `500` `Error`
   */
  updateStoreProfile = (data: StoreUpdate, params: RequestParams = {}) =>
    this.request<Store, Error>({
      path: `/stores/profile`,
      method: "PUT",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Delete authenticated store's profile
   *
   * @tags Store Management
   * @name DeleteStoreProfile
   * @summary Delete Store Profile
   * @request DELETE:/stores/profile
   * @secure
   * @response `204` `void` Store profile deleted successfully
   * @response `401` `Error`
   * @response `404` `Error`
   * @response `500` `Error`
   */
  deleteStoreProfile = (params: RequestParams = {}) =>
    this.request<void, Error>({
      path: `/stores/profile`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * @description Generates a new API key for the authenticated store
   *
   * @tags Store Management
   * @name CreateApiKey
   * @summary Generate new API key
   * @request POST:/stores/api-keys
   * @secure
   * @response `201` `ApiKey` API key created
   * @response `400` `Error`
   * @response `401` `Error`
   * @response `500` `Error`
   */
  createApiKey = (data?: ApiKeyCreate, params: RequestParams = {}) =>
    this.request<ApiKey, Error>({
      path: `/stores/api-keys`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
  /**
   * @description Returns all active API keys for the store
   *
   * @tags Store Management
   * @name GetApiKeys
   * @summary List API keys
   * @request GET:/stores/api-keys
   * @secure
   * @response `200` `ApiKeyList` List of API keys
   * @response `401` `Error`
   * @response `500` `Error`
   */
  getApiKeys = (params: RequestParams = {}) =>
    this.request<ApiKeyList, Error>({
      path: `/stores/api-keys`,
      method: "GET",
      secure: true,
      format: "json",
      ...params,
    });
  /**
   * @description Revokes a specific API key
   *
   * @tags Store Management
   * @name RevokeApiKey
   * @summary Revoke API key
   * @request DELETE:/stores/api-keys/{keyId}
   * @secure
   * @response `204` `void` API key revoked
   * @response `401` `Error`
   * @response `404` `Error`
   * @response `500` `Error`
   */
  revokeApiKey = (keyId: string, params: RequestParams = {}) =>
    this.request<void, Error>({
      path: `/stores/api-keys/${keyId}`,
      method: "DELETE",
      secure: true,
      ...params,
    });
  /**
   * @description Returns usage data for a specific API key
   *
   * @tags Store Management
   * @name GetApiKeyUsage
   * @summary Get API key usage statistics
   * @request POST:/stores/api-keys/{keyId}/usage
   * @secure
   * @response `200` `ApiKeyUsage` API key usage statistics
   * @response `401` `Error`
   * @response `404` `Error`
   * @response `500` `Error`
   */
  getApiKeyUsage = (
    keyId: string,
    data?: GetApiKeyUsagePayload,
    params: RequestParams = {},
  ) =>
    this.request<ApiKeyUsage, Error>({
      path: `/stores/api-keys/${keyId}/usage`,
      method: "POST",
      body: data,
      secure: true,
      type: ContentType.Json,
      format: "json",
      ...params,
    });
}
