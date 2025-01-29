'use strict';


/**
 * Authorize User
 * Redirect to OAuth2 authorization page.
 *
 * response_type String 
 * client_id String 
 * redirect_uri String 
 * no response value expected for this operation
 **/
exports.authAuthorizeGET = function(response_type,client_id,redirect_uri) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


/**
 * Get OAuth2 Token
 * Exchange authorization code for access token.
 *
 * returns Token
 **/
exports.authTokenPOST = function() {
  return new Promise(function(resolve, reject) {
    var examples = {};
    examples['application/json'] = {
  "access_token" : "access_token",
  "refresh_token" : "refresh_token",
  "token_type" : "token_type",
  "expires_in" : 0
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
exports.usersPOST = function(body) {
  return new Promise(function(resolve, reject) {
    var examples = {};
    examples['application/json'] = {
  "preferences" : {
    "purchase_history" : [ "purchase_history", "purchase_history" ],
    "categories" : [ "categories", "categories" ]
  },
  "role" : "customer",
  "privacy_settings" : {
    "data_sharing" : true,
    "anonymized_id" : "anonymized_id"
  },
  "id" : "046b6c7f-0b8a-43b9-b35d-6489e6daee91",
  "email" : ""
};
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}


/**
 * Delete User
 *
 * userId String 
 * no response value expected for this operation
 **/
exports.usersUserIdDELETE = function(userId) {
  return new Promise(function(resolve, reject) {
    resolve();
  });
}


/**
 * Get User Profile
 *
 * userId String 
 * returns User
 **/
exports.usersUserIdGET = function(userId) {
  return new Promise(function(resolve, reject) {
    var examples = {};
    examples['application/json'] = {
  "preferences" : {
    "purchase_history" : [ "purchase_history", "purchase_history" ],
    "categories" : [ "categories", "categories" ]
  },
  "role" : "customer",
  "privacy_settings" : {
    "data_sharing" : true,
    "anonymized_id" : "anonymized_id"
  },
  "id" : "046b6c7f-0b8a-43b9-b35d-6489e6daee91",
  "email" : ""
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
exports.usersUserIdPUT = function(body,userId) {
  return new Promise(function(resolve, reject) {
    var examples = {};
    examples['application/json'] = {
  "preferences" : {
    "purchase_history" : [ "purchase_history", "purchase_history" ],
    "categories" : [ "categories", "categories" ]
  },
  "role" : "customer",
  "privacy_settings" : {
    "data_sharing" : true,
    "anonymized_id" : "anonymized_id"
  },
  "id" : "046b6c7f-0b8a-43b9-b35d-6489e6daee91",
  "email" : ""
};
    if (Object.keys(examples).length > 0) {
      resolve(examples[Object.keys(examples)[0]]);
    } else {
      resolve();
    }
  });
}

