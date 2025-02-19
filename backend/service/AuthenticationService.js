const axios = require('axios');
const { getDB } = require('../utils/mongoUtil');
const { setCache } = require('../utils/redisUtil');
const { generateAnonymizedId } = require('../utils/helperUtil');

/**
 * Register User
 * Create a new user (customer or store).
 *
 * body UserCreate
 * returns User
 * */
exports.usersPOST = function usersPOST(body) {
  return new Promise((resolve, reject) => {});
};

/**
 * Delete User
 *
 * userId String
 * no response value expected for this operation
 * */
exports.usersUserIdDELETE = function usersUserIdDELETE(userId) {
  return new Promise((resolve, reject) => {});
};

/**
 * Get User Profile
 *
 * userId String
 * returns User
 * */
exports.usersUserIdGET = function usersUserIdGET(userId) {
  return new Promise((resolve, reject) => {});
};

/**
 * Update User Profile
 *
 * body UserUpdate
 * userId String
 * returns User
 * */
exports.usersUserIdPUT = function usersUserIdPUT(body, userId) {
  return new Promise((resolve, reject) => {});
};
