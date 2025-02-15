const { getDB } = require('../utils/mongoUtil');
const QRCode = require('qrcode');
const { rankAds } = require('../utils/adUtil');
const { logAdInteraction } = require('./RecommendationEngine/personalizationService');

/**
 * Generate QR code for store
 * Generate a dynamic QR code for in-store kiosks that customers can scan
 *
 * storeId String Store ID
 * returns Binary
 */
exports.generateQR = function generateQR(storeId) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        if (!storeId) {
          const err = new Error('Store ID is required');
          err.status = 400;
          reject(err);
          return;
        }

        const db = getDB();

        // Verify store exists
        const store = await db.collection('users').findOne({
          _id: storeId,
          role: 'store',
        });

        if (!store) {
          const err = new Error('Store not found');
          err.status = 404;
          reject(err);
          return;
        }

        // Generate QR code with store ID encoded
        const qrData = {
          type: 'store',
          id: storeId,
          timestamp: new Date().toISOString(),
        };

        const qrImage = await QRCode.toBuffer(JSON.stringify(qrData), {
          errorCorrectionLevel: 'H',
          type: 'png',
          width: 300,
          margin: 1,
        });

        resolve(qrImage);
      } catch (error) {
        const err = new Error('Internal server error');
        err.status = 500;
        err.error = error;
        reject(err);
      }
    })();
  });
};

/**
 * Process QR code scan
 * Handle QR code scan events and return personalized advertisements
 *
 * body QR_data QR scan data
 * returns AdResponse
 */
exports.processScan = function processScan(body) {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        if (!body.store_id || !body.user_id) {
          const err = new Error('Store ID and User ID are required');
          err.status = 400;
          reject(err);
          return;
        }

        const db = getDB();

        // Verify store and user exist
        const [store, user] = await Promise.all([
          db.collection('users').findOne({ _id: body.store_id, role: 'store' }),
          db.collection('users').findOne({ _id: body.user_id }),
        ]);

        if (!store || !user) {
          const err = new Error('Store or User not found');
          err.status = 404;
          reject(err);
          return;
        }

        // Find relevant ads for the store
        const ads = await db
          .collection('ads')
          .find({
            store_id: body.store_id,
            'validity_period.end': { $gt: new Date() },
            'validity_period.start': { $lt: new Date() },
          })
          .toArray();

        // Rank the ads based on user preferences and purchase history
        const recommendedAds = rankAds(ads, user);

        // Log scan event for analytics
        await logAdInteraction({
          // Use imported function
          store_id: body.store_id,
          user_id: body.user_id,
          ads_shown: recommendedAds.map((ad) => ad._id),
        });

        resolve({
          store_id: body.store_id,
          ads: recommendedAds,
        });
      } catch (error) {
        const err = new Error('Internal server error');
        err.status = 500;
        err.error = error;
        reject(err);
      }
    })();
  });
};
