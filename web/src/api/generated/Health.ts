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

import { Error, HealthStatus } from "./data-contracts";
import { HttpClient, RequestParams } from "../client";

export class Health<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * @description Comprehensive health check that verifies API and dependencies
   *
   * @tags Health
   * @name HealthCheck
   * @summary Health Check
   * @request GET:/health
   * @response `200` `HealthStatus` Health status information
   * @response `500` `Error`
   */
  healthCheck = (params: RequestParams = {}) =>
    this.request<HealthStatus, Error>({
      path: `/health`,
      method: "GET",
      format: "json",
      ...params,
    });
}
