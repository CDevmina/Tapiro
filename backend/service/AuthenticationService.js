'use strict';

const { getDB } = require('../utils/mongoUtil');

/**
 * Authorize User
 * Redirect to OAuth2 authorization page.
 *
 * response_type String 
 * client_id String 
 * redirect_uri String 
 * no response value expected for this operation
 **/
exports.authAuthorizeGET = function (response_type, client_id, redirect_uri) {
  return new Promise(function (resolve, reject) {
    resolve();
  });
}


/**
 * Get OAuth2 Token
 * Exchange authorization code for access token.
 *
 * returns Token
 **/
exports.authTokenPOST = function () {
  return new Promise(function (resolve, reject) {
    var examples = {};
    examples['application/json'] = {
      "access_token": "access_token",
      "refresh_token": "refresh_token",
      "token_type": "token_type",
      "expires_in": 0
    };
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}


/**
 * Register User
 * Create a new user (customer or store).
 *
 * body UserCreate 
 * returns User
 **/
exports.usersPOST = function (body) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = getDB();
      const result = await db.collection('users').insertOne(body);
      resolve(result.ops ? result.ops[0] : result);
    } catch (error) {
      reject(error);
    }
  });
};


/**
 * Delete User
 *
 * userId String 
 * no response value expected for this operation
 **/
exports.usersUserIdDELETE = function (userId) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = getDB();
      const result = await db.collection('users')
        .deleteOne({ _id: userId });
      resolve({ deletedCount: result.deletedCount });
    } catch (error) {
      reject(error);
    }
  });
}


/**
 * Get User Profile
 *
 * userId String 
 * returns User
 **/
exports.usersUserIdGET = function (userId) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = getDB();
      const user = await db.collection('users').findOne({ _id: userId });
      resolve(user);
    } catch (error) {
      reject(error);
    }
  });
};


/**
 * Update User Profile
 *
 * body UserUpdate 
 * userId String 
 * returns User
 **/
exports.usersUserIdPUT = function (body, userId) {
  return new Promise(async (resolve, reject) => {
    try {
      const db = getDB();
      const result = await db.collection('users')
        .updateOne({ _id: userId }, { $set: body });
      resolve({ modifiedCount: result.modifiedCount });
    } catch (error) {
      reject(error);
    }
  });
};
