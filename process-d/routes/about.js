/* About routes — Process D.
   GET /api/about: return team member names from environment variables.
   Names are stored in .env, not in the database, as required by the spec. */
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

/* GET /api/about — build team array from numbered .env variables.
   Reads DEVELOPER_N_FIRST_NAME / DEVELOPER_N_LAST_NAME until a pair is missing. */
router.get('/about', async (req, res) => {
  // Second log entry: endpoint-accessed log required by spec
  await logEndpoint(req.method, req.originalUrl);

  try {
    const team = [];
    let i = 1;

    // Loop through numbered env vars until a pair is missing
    while (process.env[`DEVELOPER_${i}_FIRST_NAME`]) {
      team.push({
        first_name: process.env[`DEVELOPER_${i}_FIRST_NAME`],
        last_name: process.env[`DEVELOPER_${i}_LAST_NAME`],
      });
      i++;
    }

    return res.status(200).json(team);
  } catch (err) {
    logger.error(err, 'GET /api/about error');
    return res.status(500).json({ id: null, message: err.message });
  }
});

module.exports = router;
