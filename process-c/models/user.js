/* User model (read-only in process-c) — used only to verify a user exists
   before accepting a new cost item. Writes to users happen in process-b only. */
const mongoose = require('mongoose');

// Schema mirrors process-b's user model — only used here for existence checks
const userSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  birthday: { type: Date, required: true },
});

module.exports = mongoose.model('User', userSchema, 'users');
