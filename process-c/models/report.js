/* Report model — implements the Computed Design Pattern.
   When a monthly report is requested for a past month, the computed result is
   saved here. Subsequent requests for the same userid+year+month are served
   directly from this cache without querying the costs collection again.
   This is safe because the server rejects cost entries with past dates,
   so a past month's data can never change after it has been computed. */
const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  userid: { type: Number, required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  // costs stores the fully-formatted grouped array, ready to return as-is
  costs: { type: Array, required: true },
});

// Compound unique index — one cached report per user per month
reportSchema.index({ userid: 1, year: 1, month: 1 }, { unique: true });

module.exports = mongoose.model('Report', reportSchema, 'reports');
