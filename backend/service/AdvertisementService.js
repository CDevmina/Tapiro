const { getDB } = require('../utils/mongoUtil');
const { respondWithCode } = require('../utils/writer');
const axios = require('axios');

exports.createAd = async function createAd(req, storeId, body) {
  try {
    const db = getDB();
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Verify user is from store
    let userData;
    try {
      const response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      userData = response.data;

      const user = await db.collection('users').findOne({ email: userData.email });
      if (!user || user.role !== 'store') {
        return respondWithCode(403, {
          code: 403,
          message: 'Insufficient permissions',
        });
      }
    } catch (error) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid token',
      });
    }

    // Create advertisement
    const ad = {
      ...body,
      storeId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection('advertisements').insertOne(ad);

    return respondWithCode(201, {
      ...ad,
      id: result.insertedId,
    });
  } catch (error) {
    console.error('Advertisement creation failed:', error);
    return respondWithCode(500, {
      code: 500,
      message: 'Internal server error',
    });
  }
};

exports.listAds = async function listAds(req, storeId) {
  try {
    const db = getDB();
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Verify permissions
    try {
      const response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = response.data;

      const user = await db.collection('users').findOne({ email: userData.email });
      if (!user || (user.role !== 'store' && user.role !== 'user')) {
        return respondWithCode(403, {
          code: 403,
          message: 'Insufficient permissions',
        });
      }
    } catch (error) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid token',
      });
    }

    // Get advertisements
    const ads = await db.collection('advertisements').find({ storeId }).toArray();

    return respondWithCode(200, ads);
  } catch (error) {
    console.error('Advertisement listing failed:', error);
    return respondWithCode(500, {
      code: 500,
      message: 'Internal server error',
    });
  }
};

exports.updateAd = async function updateAd(req, storeId, adId, body) {
  try {
    const db = getDB();
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Verify store permissions
    try {
      const response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = response.data;

      const user = await db.collection('users').findOne({ email: userData.email });
      if (!user || user.role !== 'store') {
        return respondWithCode(403, {
          code: 403,
          message: 'Insufficient permissions',
        });
      }
    } catch (error) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid token',
      });
    }

    // Update advertisement
    const result = await db.collection('advertisements').findOneAndUpdate(
      { _id: adId, storeId },
      {
        $set: {
          ...body,
          updatedAt: new Date(),
        },
      },
      { returnDocument: 'after' },
    );

    if (!result) {
      return respondWithCode(404, {
        code: 404,
        message: 'Advertisement not found',
      });
    }

    return respondWithCode(200, result);
  } catch (error) {
    console.error('Advertisement update failed:', error);
    return respondWithCode(500, {
      code: 500,
      message: 'Internal server error',
    });
  }
};

exports.deleteAd = async function deleteAd(req, storeId, adId) {
  try {
    const db = getDB();
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return respondWithCode(401, {
        code: 401,
        message: 'No authorization token provided',
      });
    }

    // Verify store permissions
    try {
      const response = await axios.get(`${process.env.AUTH0_ISSUER_BASE_URL}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const userData = response.data;

      const user = await db.collection('users').findOne({ email: userData.email });
      if (!user || user.role !== 'store') {
        return respondWithCode(403, {
          code: 403,
          message: 'Insufficient permissions',
        });
      }
    } catch (error) {
      return respondWithCode(401, {
        code: 401,
        message: 'Invalid token',
      });
    }

    // Delete advertisement
    const result = await db.collection('advertisements').deleteOne({ _id: adId, storeId });

    if (result.deletedCount === 0) {
      return respondWithCode(404, {
        code: 404,
        message: 'Advertisement not found',
      });
    }

    return respondWithCode(204);
  } catch (error) {
    console.error('Advertisement deletion failed:', error);
    return respondWithCode(500, {
      code: 500,
      message: 'Internal server error',
    });
  }
};
