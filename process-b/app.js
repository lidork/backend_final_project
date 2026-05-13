/* Process B — Users service.
   Handles user management. Endpoints: POST /api/add, GET /api/users, GET /api/users/:id */
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { loggerMiddleware } = require('./middleware/logger');

const app = express();

// Parse incoming JSON request bodies
app.use(express.json());

// Write a log entry to MongoDB for every request
app.use(loggerMiddleware);

// Users routes: POST /api/add, GET /api/users, GET /api/users/:id
app.use('/api', require('./routes/users'));

/* Connect to MongoDB Atlas using the URI from .env,
   then start listening. Export app for testing without starting the server. */
if (require.main === module) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      app.listen(process.env.PORT, () => {
        console.log(`Process B running on port ${process.env.PORT}`);
      });
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err);
      process.exit(1);
    });
}

module.exports = app;
