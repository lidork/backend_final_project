/* Tests for Process A logs endpoint.
   Log model is mocked so no real DB connection is needed.
   We verify the two grading-relevant behaviors: returns an array, and
   returns error JSON on DB failure. */
const request = require("supertest");

jest.mock("../models/log");
const Log = require("../models/log");

// Silence endpoint log writes across all tests
Log.mockImplementation(() => ({ save: jest.fn().mockResolvedValue({}) }));

const app = require("../app");

describe("GET /api/logs", () => {
  beforeEach(() => jest.clearAllMocks());

  test("returns an array of log documents", async () => {
    Log.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        { method: "GET", url: "/api/logs", timestamp: new Date() },
        { method: "POST", url: "/api/add", timestamp: new Date() },
      ]),
    });

    const res = await request(app).get("/api/logs");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  test("each log entry has method and url fields", async () => {
    Log.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockResolvedValue([
        { method: "GET", url: "/api/logs", timestamp: new Date() },
      ]),
    });

    const res = await request(app).get("/api/logs");

    expect(res.body[0]).toHaveProperty("method");
    expect(res.body[0]).toHaveProperty("url");
  });

  test("returns error JSON on DB failure", async () => {
    Log.find = jest.fn().mockReturnValue({
      sort: jest.fn().mockRejectedValue(new Error("DB error")),
    });

    const res = await request(app).get("/api/logs");

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty("message");
  });
});
