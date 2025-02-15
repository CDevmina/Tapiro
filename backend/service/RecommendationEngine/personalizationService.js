const { getDB } = require('../../utils/mongoUtil');

/**
 * Log ad interaction for analytics
 * @param {Object} event - Interaction event details
 * @returns {Promise<void>}
 */
exports.logAdInteraction = async function logAdInteraction(event) {
  const db = getDB();
  await db.collection('scan_events').insertOne({
    ...event,
    timestamp: new Date(),
  });
};
