/* Tests for Process D about endpoint.
   Log model is mocked. We verify the two grading-critical behaviors:
   returns exactly first_name + last_name per member, and no extra fields. */
const request = require("supertest");

jest.mock("../models/log");
const Log = require("../models/log");

// Silence endpoint log writes across all tests
Log.mockImplementation(() => ({ save: jest.fn().mockResolvedValue({}) }));

// Set env vars before loading app so the route reads them
process.env.DEVELOPER_1_FIRST_NAME = "Lidor";
process.env.DEVELOPER_1_LAST_NAME = "Kalfon";
process.env.DEVELOPER_2_FIRST_NAME = "Dana";
process.env.DEVELOPER_2_LAST_NAME = "Mund";

const app = require("../app");

describe("GET /api/about", () => {
  beforeEach(() => jest.clearAllMocks());

  test("returns an array with one entry per team member", async () => {
    const res = await request(app).get("/api/about");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });

  test("each entry contains only first_name and last_name", async () => {
    const res = await request(app).get("/api/about");

    for (const member of res.body) {
      expect(member).toHaveProperty("first_name");
      expect(member).toHaveProperty("last_name");
      // Must not contain any extra fields
      expect(Object.keys(member)).toEqual(["first_name", "last_name"]);
    }
  });

  test("names match the values set in environment variables", async () => {
    const res = await request(app).get("/api/about");

    expect(res.body[0]).toEqual({ first_name: "Lidor", last_name: "Kalfon" });
    expect(res.body[1]).toEqual({ first_name: "Dana", last_name: "Mund" });
  });
});
