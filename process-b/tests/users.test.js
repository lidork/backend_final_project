/* Tests for Process B user endpoints.
   Both User and Cost models are mocked so no real DB connection is needed.
   We test the behaviors that matter for grading: field validation, duplicate
   detection, correct response shape, and the total cost aggregation. */
const request = require("supertest");

jest.mock("../models/user");
jest.mock("../models/cost");
jest.mock("../models/log");

const User = require("../models/user");
const Cost = require("../models/cost");
const Log = require("../models/log");

// Silence the endpoint log writes in all tests
Log.mockImplementation(() => ({ save: jest.fn().mockResolvedValue({}) }));

const app = require("../app");

describe("POST /api/add", () => {
  beforeEach(() => jest.clearAllMocks());

  test("creates a user and returns the saved document", async () => {
    const userData = { id: 1, first_name: "Alice", last_name: "Smith", birthday: "1990-01-01" };
    User.findOne = jest.fn().mockResolvedValue(null);
    User.mockImplementation(() => ({
      save: jest.fn().mockResolvedValue(userData),
    }));

    const res = await request(app).post("/api/add").send(userData);

    expect(res.status).toBe(201);
    expect(res.body.first_name).toBe("Alice");
  });

  test("returns error JSON when a required field is missing", async () => {
    const res = await request(app).post("/api/add").send({ id: 2, first_name: "Bob" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("message");
  });

  test("returns error JSON when id already exists", async () => {
    User.findOne = jest.fn().mockResolvedValue({ id: 123123 });

    const res = await request(app).post("/api/add").send({
      id: 123123, first_name: "mosh", last_name: "israeli", birthday: "1990-01-01",
    });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty("message");
  });
});

describe("GET /api/users", () => {
  beforeEach(() => jest.clearAllMocks());

  test("returns an array of all users", async () => {
    User.find = jest.fn().mockResolvedValue([
      { id: 1, first_name: "Alice", last_name: "Smith" },
      { id: 2, first_name: "Bob", last_name: "Jones" },
    ]);

    const res = await request(app).get("/api/users");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toHaveLength(2);
  });
});

describe("GET /api/users/:id", () => {
  beforeEach(() => jest.clearAllMocks());

  test("returns user with total cost field", async () => {
    User.findOne = jest.fn().mockResolvedValue({ id: 1, first_name: "Alice", last_name: "Smith" });
    Cost.aggregate = jest.fn().mockResolvedValue([{ _id: null, total: 250 }]);

    const res = await request(app).get("/api/users/1");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("total", 250);
    expect(res.body).toHaveProperty("first_name");
    expect(res.body).toHaveProperty("last_name");
  });

  test("returns error JSON for a non-existent user", async () => {
    User.findOne = jest.fn().mockResolvedValue(null);

    const res = await request(app).get("/api/users/9999");

    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("message");
  });
});
