// MongoDB Shell Setup Script
// Run with: mongosh "your_atlas_connection_string" mongo-setup.js

// Switch to the project database
use("cost_manager");

// ── Users Collection ──────────────────────────────────────────────
db.createCollection("users");

db.users.createIndex({ id: 1 }, { unique: true });

// Seed user required by the project spec
db.users.insertOne({
  id: 123123,
  first_name: "mosh",
  last_name: "israeli",
  birthday: new Date("1990-01-01")
});

print("users collection created with seed user.");

// ── Costs Collection ──────────────────────────────────────────────
db.createCollection("costs");

// Index for fast monthly report queries
db.costs.createIndex({ userid: 1, date: 1 });

print("costs collection created.");

// ── Logs Collection ───────────────────────────────────────────────
db.createCollection("logs");

db.logs.createIndex({ timestamp: -1 });

print("logs collection created.");

// ── Reports Collection (Computed Design Pattern cache) ────────────
db.createCollection("reports");

// Unique index so each user+year+month combo is stored once
db.reports.createIndex({ userid: 1, year: 1, month: 1 }, { unique: true });

print("reports collection created.");

print("\nSetup complete. Collections in database:");
db.getCollectionNames().forEach(name => print(" -", name));

print("\nSeed user inserted:");
printjson(db.users.findOne({ id: 123123 }));
