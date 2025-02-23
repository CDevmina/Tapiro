const { getDB } = require('../utils/mongoUtil');
const { respondWithCode } = require('../utils/writer');
const { generateQRCode } = require('../utils/qrUtil');
const axios = require('axios');

exports.generateQR = async function generateQR(req, storeId) {
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

    // Generate QR code with store ID embedded
    const qrCode = await generateQRCode(storeId);

    return respondWithCode(200, qrCode);
  } catch (error) {
    console.error('QR code generation failed:', error);
    return respondWithCode(500, {
      code: 500,
      message: 'Internal server error',
    });
  }
};

exports.processScan = async function processScan(req, body) {
  try {
    const db = getDB();
    const { store_id, user_id } = body;

    // Get active ads for the store
    const ads = await db
      .collection('advertisements')
      .find({
        storeId: store_id,
        'validity_period.start': { $lte: new Date() },
        'validity_period.end': { $gte: new Date() },
      })
      .toArray();

    if (!ads.length) {
      return respondWithCode(404, {
        code: 404,
        message: 'No active advertisements found',
      });
    }

    // Get user preferences if user_id is provided
    let personalizedAds = ads;
    if (user_id) {
      const user = await db.collection('users').findOne({ _id: user_id });
      if (user?.preferences?.categories?.length) {
        personalizedAds = ads.filter((ad) =>
          ad.target_categories.some((category) => user.preferences.categories.includes(category)),
        );
      }
    }

    return respondWithCode(200, {
      store_id,
      ads: personalizedAds,
    });
  } catch (error) {
    console.error('QR code processing failed:', error);
    return respondWithCode(500, {
      code: 500,
      message: 'Internal server error',
    });
  }
};
