/* Tests for the logger middleware.
   The Log model is mocked so no real DB connection is needed.
   We verify the three things that matter: a log is saved on every request,
   the saved entry has the correct fields, and a DB failure does not
   break the request (next() is still called). */
const request = require("supertest");
const express = require("express");

// Mock the Log model before requiring the middleware
jest.mock("../models/log");
const Log = require("../models/log");

const { loggerMiddleware } = require("../middleware/logger");

// Minimal Express app used only for these tests
const app = express();
app.use(loggerMiddleware);
app.get("/test", (req, res) => res.status(200).json({ ok: true }));

describe("Logger middleware", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // A log entry must be saved to MongoDB on every request
  test("saves a log entry on each request", async () => {
    const mockSave = jest.fn().mockResolvedValue({});
    Log.mockImplementation(() => ({ save: mockSave }));

    await request(app).get("/test");

    expect(mockSave).toHaveBeenCalledTimes(1);
  });

  // The saved entry must capture method and url — these are the fields /api/logs returns
  test("log entry contains correct method and url", async () => {
    let savedData = {};
    Log.mockImplementation((data) => {
      savedData = data;
      return { save: jest.fn().mockResolvedValue({}) };
    });

    await request(app).get("/test");

    expect(savedData.method).toBe("GET");
    expect(savedData.url).toBe("/test");
  });

  // A DB failure must not take down the request — next() must still be called
  test("continues to next() even if DB save fails", async () => {
    Log.mockImplementation(() => ({
      save: jest.fn().mockRejectedValue(new Error("DB error")),
    }));

    const res = await request(app).get("/test");

    // Request must complete successfully despite the DB error
    expect(res.status).toBe(200);
  });
});
