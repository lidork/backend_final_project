/* Cost model — read-only reference used by process-b to sum costs per user.
   Full cost management is handled by process-c. */
const mongoose = require('mongoose');

// Only the fields needed for the aggregate sum query
const costSchema = new mongoose.Schema({
  userid: { type: Number, required: true },
  sum: { type: Number, required: true },
});

module.exports = mongoose.model('Cost', costSchema, 'costs');
