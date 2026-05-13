/* Process C — Costs service.
   Handles cost management. Endpoints: POST /api/add, GET /api/report */
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const { loggerMiddleware } = require('./middleware/logger');

const app = express();

// Parse incoming JSON request bodies
app.use(express.json());

// Write a log entry to MongoDB for every request
app.use(loggerMiddleware);

// Costs routes: POST /api/add, GET /api/report
app.use('/api', require('./routes/costs'));

/* Connect to MongoDB Atlas using the URI from .env,
   then start listening. Export app for testing without starting the server. */
if (require.main === module) {
  mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
      app.listen(process.env.PORT, () => {
        console.log(`Process C running on port ${process.env.PORT}`);
      });
    })
    .catch((err) => {
      console.error('MongoDB connection error:', err);
      process.exit(1);
    });
}

module.exports = app;
