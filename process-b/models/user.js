/* User model — maps to the users collection in MongoDB.
   The id field is a custom numeric identifier, separate from _id which MongoDB generates automatically. */
const mongoose = require('mongoose');

// Schema definition with exact types required by the project spec
const userSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  birthday: { type: Date, required: true },
});

// Export the model bound to the users collection
module.exports = mongoose.model('User', userSchema, 'users');
