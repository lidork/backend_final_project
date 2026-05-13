/* Logs routes — Process A.
   GET /api/logs: return all log entries from the logs collection. */
const express = require('express');
const router = express.Router();
const Log = require('../models/log');
const { logger } = require('../middleware/logger');

/**
 * Writes an endpoint-accessed log entry to MongoDB.
 * @param {string} method - HTTP method of the request.
 * @param {string} url - URL path of the request.
 */
async function logEndpoint(method, url) {
  try {
    await new Log({ method, url }).save();
  } catch (err) {
    logger.error(err, 'failed to save endpoint log');
  }
}

// GET /api/logs — return all documents from the logs collection as a JSON array
router.get('/logs', async (req, res) => {
  // Second log entry: endpoint-accessed log required by spec
  await logEndpoint(req.method, req.originalUrl);

  try {
    const logs = await Log.find({}).sort({ timestamp: -1 });
    return res.status(200).json(logs);
  } catch (err) {
    logger.error(err, 'GET /api/logs error');
    return res.status(500).json({ id: null, message: err.message });
  }
});

module.exports = router;
