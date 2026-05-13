/* Tests for Process C cost endpoints.
   Cost, User, Report, and Log models are all mocked — no real DB connection needed.
   We test the behaviors that matter for grading: field validation, category validation,
   user-exists check, correct report structure with all 5 categories, and cache behavior. */
const request = require("supertest");

jest.mock("../models/cost");
jest.mock("../models/user");
jest.mock("../models/report");
jest.mock("../models/log");

const Cost = require("../models/cost");
const User = require("../models/user");
const Report = require("../models/report");
const Log = require("../models/log");

// Silence endpoint log writes across all tests
Log.mockImplementation(() => ({ save: jest.fn().mockResolvedValue({}) }));

const app = require("../app");

describe("POST /api/add (cost)", () => {
  beforeEach(() => jest.clearAllMocks());

  test("saves a valid cost and returns the document", async () => {
    const costData = { userid: 123123, description: "groceries", category: "food", sum: 50 };
    User.findOne = jest.fn().mockResolvedValue({ id: 123123 });
    Cost.mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(costData),
    }));

    const res = await request(app).post("/api/add").send(costData);

    expect(res.status).toBe(201);
    expect(res.body.category).toBe("food");
  });

  test("returns 400 for an invalid category", async () => {
    const res = await request(app).post("/api/add").send({
      userid: 123123, description: "taxi", category: "transport", sum: 20,
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("message");
  });

  test("returns 400 when a required field is missing", async () => {
    const res = await request(app).post("/api/add").send({
      userid: 123123, category: "food",
    });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });

  test("returns 404 when userid does not exist", async () => {
    User.findOne = jest.fn().mockResolvedValue(null);

    const res = await request(app).post("/api/add").send({
      userid: 999999, description: "test", category: "food", sum: 10,
    });

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("message");
  });
});

describe("GET /api/report", () => {
  beforeEach(() => jest.clearAllMocks());

  test("returns grouped report with all 5 categories", async () => {
    // Past month so cache logic runs
    Report.findOne = jest.fn().mockResolvedValue(null);
    Report.findOneAndUpdate = jest.fn().mockResolvedValue({});
    Cost.find = jest.fn().mockResolvedValue([
      { category: "food", sum: 50, description: "groceries", date: new Date("2025-01-10") },
    ]);

    const res = await request(app).get("/api/report?id=123123&year=2025&month=1");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("costs");
    // All 5 categories must be present
    const keys = res.body.costs.map((c) => Object.keys(c)[0]);
    expect(keys).toEqual(expect.arrayContaining(["food", "health", "housing", "sports", "education"]));
    expect(keys).toHaveLength(5);
  });

  test("returns cached report on second call for a past month", async () => {
    const cachedCosts = [
      { food: [{ sum: 50, description: "groceries", day: 10 }] },
      { health: [] }, { housing: [] }, { sports: [] }, { education: [] },
    ];
    Report.findOne = jest.fn().mockResolvedValue({ costs: cachedCosts });

    const res = await request(app).get("/api/report?id=123123&year=2025&month=1");

    expect(res.status).toBe(200);
    // Cost.find should NOT have been called — served from cache
    expect(Cost.find).not.toHaveBeenCalled();
  });

  test("returns 400 when query params are missing", async () => {
    const res = await request(app).get("/api/report?id=123123&year=2025");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });
});
