/* Costs routes — Process C.
   POST /api/add: validate and save a new cost item.
   GET /api/report: monthly report with Computed Design Pattern caching. */
const express = require('express');
const router = express.Router();
const Cost = require('../models/cost');
const User = require('../models/user');
const Report = require('../models/report');
const Log = require('../models/log');
const { logger } = require('../middleware/logger');

// All valid categories defined by the spec
const CATEGORIES = ['food', 'health', 'housing', 'sports', 'education'];

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

/* POST /api/add — validate and save a new cost item.
   Verifies the user exists before saving. Category is validated against the
   allowed enum; an invalid category returns 400 before hitting the DB. */
router.post('/add', async (req, res) => {
  await logEndpoint(req.method, req.originalUrl);

  const { description, category, userid, sum, date } = req.body;

  // Validate required fields are present
  if (!description || !category || userid === undefined || sum === undefined) {
    return res.status(400).json({ id: userid ?? null, message: 'Missing required fields: description, category, userid, sum' });
  }

  // Validate category against the allowed list
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ id: userid, message: `category must be one of: ${CATEGORIES.join(', ')}` });
  }

  // Validate userid is a number
  if (typeof userid !== 'number') {
    return res.status(400).json({ id: userid, message: 'userid must be a number' });
  }

  // Validate sum is a positive number (added post-submission — negative sums skewed user totals)
  if (typeof sum !== 'number' || sum <= 0) {
    return res.status(400).json({ id: userid, message: 'sum must be a positive number' });
  }

  try {
    // Verify the user exists before accepting the cost
    const user = await User.findOne({ id: userid });
    if (!user) {
      return res.status(404).json({ id: userid, message: `User ${userid} not found` });
    }

    // Build the cost document; use provided date or let the schema default to now
    const costData = { description, category, userid, sum };
    if (date) costData.date = new Date(date);

    const cost = new Cost(costData);
    const saved = await cost.save();
    return res.status(201).json(saved);
  } catch (err) {
    logger.error(err, 'POST /api/add (cost) error');
    return res.status(500).json({ id: userid, message: err.message });
  }
});

/*
 * GET /api/report — Computed Design Pattern
 *
 * The report is expensive to compute: it queries all costs for a user in a given
 * month and groups them by category. For past months the data is immutable (costs
 * with past dates are rejected), so we cache the result in the `reports` collection
 * after the first computation. Subsequent requests for the same userid+year+month
 * hit the cache directly, skipping the costs query entirely.
 *
 * Current or future months are never cached because new costs may still arrive.
 */
router.get('/report', async (req, res) => {
  await logEndpoint(req.method, req.originalUrl);

  const { id, year, month } = req.query;

  // Validate all three params are present and numeric
  if (!id || !year || !month) {
    return res.status(400).json({ id: id ?? null, message: 'Missing required query params: id, year, month' });
  }
  const userid = Number(id);
  const yearNum = Number(year);
  const monthNum = Number(month);
  if (isNaN(userid) || isNaN(yearNum) || isNaN(monthNum)) {
    return res.status(400).json({ id, message: 'id, year, and month must be numbers' });
  }

  if (monthNum < 1 || monthNum > 12) {
    return res.status(400).json({ id, message: 'month must be between 1 and 12' });
  }

  try {
    // Determine whether this month is in the past (safe to cache)
    const now = new Date();
    const isPastMonth = yearNum < now.getFullYear() ||
      (yearNum === now.getFullYear() && monthNum < now.getMonth() + 1);

    // Check for a cached report if the month is in the past
    if (isPastMonth) {
      const cached = await Report.findOne({ userid, year: yearNum, month: monthNum });
      if (cached) {
        return res.status(200).json({ userid, year: yearNum, month: monthNum, costs: cached.costs });
      }
    }

    // Query costs collection for matching userid, year, and month
    const startDate = new Date(yearNum, monthNum - 1, 1);
    const endDate = new Date(yearNum, monthNum, 1);
    const costDocs = await Cost.find({
      userid,
      date: { $gte: startDate, $lt: endDate },
    });

    // Group results by category; all 5 categories must appear even if empty
    const grouped = {};
    for (const cat of CATEGORIES) grouped[cat] = [];

    for (const c of costDocs) {
      grouped[c.category].push({
        sum: c.sum,
        description: c.description,
        day: new Date(c.date).getDate(),
      });
    }

    // Format into the required array structure
    const costsArray = CATEGORIES.map((cat) => ({ [cat]: grouped[cat] }));

    // Cache the result if the month is in the past
    if (isPastMonth) {
      await Report.findOneAndUpdate(
        { userid, year: yearNum, month: monthNum },
        { userid, year: yearNum, month: monthNum, costs: costsArray },
        { upsert: true }
      );
    }

    return res.status(200).json({ userid, year: yearNum, month: monthNum, costs: costsArray });
  } catch (err) {
    logger.error(err, 'GET /api/report error');
    return res.status(500).json({ id: userid, message: err.message });
  }
});

module.exports = router;
