/* Cost model — maps to the costs collection in MongoDB.
   The date field defaults to now so callers don't need to pass it explicitly. */
const mongoose = require('mongoose');

// Valid categories as defined by the project spec
const CATEGORIES = ['food', 'health', 'housing', 'sports', 'education'];

const costSchema = new mongoose.Schema({
  description: { type: String, required: true },
  category: { type: String, required: true, enum: CATEGORIES },
  userid: { type: Number, required: true },
  sum: { type: Number, required: true },
  // date defaults to the moment the request is received
  date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Cost', costSchema, 'costs');
