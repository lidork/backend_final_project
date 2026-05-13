/* Logger middleware — runs on every incoming HTTP request.
   Uses Pino for structured console logging and also persists each
   request as a document in the logs collection for the /api/logs endpoint. */
const pino = require('pino');
const Log = require('../models/log');

// Pino writes structured JSON logs to stdout
const logger = pino();

/**
 * Express middleware that logs every incoming request to stdout and MongoDB.
 * @param {object} req - Express request object.
 * @param {object} res - Express response object.
 * @param {Function} next - Express next middleware function.
 */
const loggerMiddleware = async (req, res, next) => {
  // Log to console via Pino
  logger.info({ method: req.method, url: req.url }, 'incoming request');

  // Persist to MongoDB — failure must not break the request
  try {
    const entry = new Log({ method: req.method, url: req.url });
    await entry.save();
  } catch (err) {
    logger.error(err, 'failed to save log entry');
  }

  next();
};

module.exports = { logger, loggerMiddleware };
