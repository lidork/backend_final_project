/* Log model — maps to the logs collection in MongoDB.
   A log entry is written on every incoming HTTP request. */
const mongoose = require('mongoose');

// Schema stores the HTTP method, URL, and time of each request
const logSchema = new mongoose.Schema({
  method: { type: String, required: true },
  url: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Log', logSchema, 'logs');
