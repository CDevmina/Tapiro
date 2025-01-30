'use strict';
const axios = require('axios');
const { getDB } = require('../utils/mongoUtil');
const { setCache } = require('../utils/redisUtil');
const { generateAnonymizedId } = require('../utils/helperUtil');

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
exports.authTokenPOST = async function (body) {
  const tokenEndpoint = 'https://dev-zuxebycdcmuazvo8.us.auth0.com/oauth/token';

  try {
    const response = await axios.post(tokenEndpoint, {
      grant_type: body.grant_type,
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      code: body.code,
      redirect_uri: body.redirect_uri
    });

    // Cache the token with user info
    await setCache(`token:${response.data.access_token}`, JSON.stringify({
      token: response.data.access_token,
      expires_in: response.data.expires_in
    }), {
      EX: response.data.expires_in
    });

    return response.data;
  } catch (error) {
    console.error('Token exchange error:', error);
    throw error;
  }
};


/**
 * Register User
 * Create a new user (customer or store).
 *
 * body UserCreate 
 * returns User
 **/
exports.usersPOST = async function (body) {
  const db = getDB();
  const users = db.collection('users');

  try {
    const newUser = {
      email: body.email,
      role: body.role,
      preferences: {},
      privacy_settings: {
        data_sharing: true,
        anonymized_id: generateAnonymizedId()
      },
      created_at: new Date()
    };

    const result = await users.insertOne(newUser);
    return { ...newUser, id: result.insertedId };
  } catch (error) {
    console.error('User creation error:', error);
    throw error;
  }
};


/**
 * Delete User
 *
 * userId String 
 * no response value expected for this operation
 **/
exports.usersUserIdDELETE = function (userId) {
  return new Promise(function (resolve, reject) {
    resolve();
  });
}


/**
 * Get User Profile
 *
 * userId String 
 * returns User
 **/
exports.usersUserIdGET = function (userId) {
  return new Promise(function (resolve, reject) {
    var examples = {};
    examples['application/json'] = {
      "preferences": {
        "purchase_history": ["purchase_history", "purchase_history"],
        "categories": ["categories", "categories"]
      },
      "role": "customer",
      "privacy_settings": {
        "data_sharing": true,
        "anonymized_id": "anonymized_id"
      },
      "id": "046b6c7f-0b8a-43b9-b35d-6489e6daee91",
      "email": ""
    };
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}


/**
 * Update User Profile
 *
 * body UserUpdate 
 * userId String 
 * returns User
 **/
exports.usersUserIdPUT = function (body, userId) {
  return new Promise(function (resolve, reject) {
    var examples = {};
    examples['application/json'] = {
      "preferences": {
        "purchase_history": ["purchase_history", "purchase_history"],
        "categories": ["categories", "categories"]
      },
      "role": "customer",
      "privacy_settings": {
        "data_sharing": true,
        "anonymized_id": "anonymized_id"
      },
      "id": "046b6c7f-0b8a-43b9-b35d-6489e6daee91",
      "email": ""
    };
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}

