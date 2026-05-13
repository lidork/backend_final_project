/* Users routes — Process B.
   POST /api/add: create a new user.
   GET /api/users: list all users.
   GET /api/users/:id: one user plus their total costs. */
const express = require('express');
const router = express.Router();
const User = require('../models/user');
const Cost = require('../models/cost');
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

/* POST /api/add — add a new user to the users collection.
   Validates required fields, checks for duplicate id, then saves. */
router.post('/add', async (req, res) => {
  // Log that this endpoint was accessed (second log entry per request)
  await logEndpoint(req.method, req.originalUrl);

  const { id, first_name, last_name, birthday } = req.body;

  // Validate all required fields are present
  if (!id || !first_name || !last_name || !birthday) {
    return res.status(400).json({ id: id || null, message: 'Missing required fields: id, first_name, last_name, birthday' });
  }

  // Validate id is a number
  if (typeof id !== 'number') {
    return res.status(400).json({ id, message: 'id must be a number' });
  }

  // Validate birthday is a parseable date
  const parsedDate = new Date(birthday);
  if (isNaN(parsedDate.getTime())) {
    return res.status(400).json({ id, message: 'birthday must be a valid date' });
  }

  try {
    // Check for duplicate id before attempting save
    const existing = await User.findOne({ id });
    if (existing) {
      return res.status(409).json({ id, message: `User with id ${id} already exists` });
    }

    // Save and return the new user document
    const user = new User({ id, first_name, last_name, birthday: parsedDate });
    const saved = await user.save();
    return res.status(201).json(saved);
  } catch (err) {
    logger.error(err, 'POST /api/add error');
    return res.status(500).json({ id, message: err.message });
  }
});

// GET /api/users — return all users in the collection as a JSON array
router.get('/users', async (req, res) => {
  await logEndpoint(req.method, req.originalUrl);

  try {
    const users = await User.find({});
    return res.status(200).json(users);
  } catch (err) {
    logger.error(err, 'GET /api/users error');
    return res.status(500).json({ id: null, message: err.message });
  }
});

/* GET /api/users/:id — return one user plus the sum of all their costs.
   Queries the costs collection by userid and sums the sum field. */
router.get('/users/:id', async (req, res) => {
  await logEndpoint(req.method, req.originalUrl);

  const userId = Number(req.params.id);
  if (isNaN(userId)) {
    return res.status(400).json({ id: req.params.id, message: 'id must be a number' });
  }

  try {
    const user = await User.findOne({ id: userId });
    if (!user) {
      return res.status(404).json({ id: userId, message: `User ${userId} not found` });
    }

    // Sum all costs for this user
    const result = await Cost.aggregate([
      { $match: { userid: userId } },
      { $group: { _id: null, total: { $sum: '$sum' } } },
    ]);
    const total = result.length > 0 ? result[0].total : 0;

    return res.status(200).json({
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      total,
    });
  } catch (err) {
    logger.error(err, 'GET /api/users/:id error');
    return res.status(500).json({ id: userId, message: err.message });
  }
});

module.exports = router;
