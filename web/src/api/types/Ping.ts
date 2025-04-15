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

import { PingStatus } from "./data-contracts";
import { HttpClient, RequestParams } from "./http-client";

export class Ping<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * @description Simple ping endpoint for uptime monitoring
   *
   * @tags Health
   * @name Ping
   * @summary Simple Uptime Check
   * @request GET:/ping
   * @response `200` `PingStatus` Simple response indicating the API is up
   */
  ping = (params: RequestParams = {}) =>
    this.request<PingStatus, any>({
      path: `/ping`,
      method: "GET",
      format: "json",
      ...params,
    });
}
