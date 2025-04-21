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

import { Error, Taxonomy } from "./data-contracts";
import { HttpClient, RequestParams } from "./http-client";

export class Taxonomy<
  SecurityDataType = unknown,
> extends HttpClient<SecurityDataType> {
  /**
   * @description Retrieves the full taxonomy structure from the database.
   *
   * @tags Taxonomy
   * @name GetTaxonomyCategories
   * @summary Get Taxonomy Categories
   * @request GET:/taxonomy/categories
   * @response `200` `Taxonomy` Successfully retrieved the taxonomy.
   * @response `404` `Error` Taxonomy data not found in the database.
   * @response `500` `Error`
   */
  getTaxonomyCategories = (params: RequestParams = {}) =>
    this.request<Taxonomy, Error>({
      path: `/taxonomy/categories`,
      method: "GET",
      format: "json",
      ...params,
    });
}
