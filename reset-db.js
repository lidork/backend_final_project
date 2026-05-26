// Database reset script — run before submission.
// Clears costs, logs, and reports collections entirely.
// Resets users to only the required seed user.
// Run with: node reset-db.js (from the project root)

const path = require('path');
const processA = path.join(__dirname, 'process-a');

require(path.join(processA, 'node_modules', 'dotenv')).config({ path: path.join(processA, '.env') });
const mongoose = require(path.join(processA, 'node_modules', 'mongoose'));

async function reset() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB Atlas.');

  const db = mongoose.connection.db;

  // Clear transactional collections
  await db.collection('costs').deleteMany({});
  console.log('costs cleared.');

  await db.collection('logs').deleteMany({});
  console.log('logs cleared.');

  await db.collection('reports').deleteMany({});
  console.log('reports cleared.');

  // Reset users to seed user only
  await db.collection('users').deleteMany({});
  await db.collection('users').insertOne({
    id: 123123,
    first_name: 'mosh',
    last_name: 'israeli',
  });
  console.log('users reset — seed user inserted.');

  // Verify
  const users = await db.collection('users').find({}).toArray();
  console.log('\nusers collection now contains:');
  console.log(JSON.stringify(users, null, 2));

  await mongoose.disconnect();
  console.log('\nDone. Database is ready for submission.');
}

reset().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
