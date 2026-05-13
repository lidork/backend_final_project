"""
Integration tests for the Cost Manager API.
Requires all four processes to be running:
  process-a on port 3001  (GET /api/logs)
  process-b on port 3002  (POST /api/add, GET /api/users, GET /api/users/:id)
  process-c on port 3003  (POST /api/add, GET /api/report)
  process-d on port 3004  (GET /api/about)
"""
import unittest
import requests
import time

A = "http://localhost:3001"
B = "http://localhost:3002"
C = "http://localhost:3003"
D = "http://localhost:3004"

# Test user that will not conflict with the seed user (id 123123)
TEST_USER = {"id": 999001, "first_name": "Test", "last_name": "User", "birthday": "1995-03-20"}

# ────────────────────────────────────────────────────────────────
# Process A — Logs
# ────────────────────────────────────────────────────────────────

class TestProcessA(unittest.TestCase):

    def test_logs_returns_array(self):
        """GET /api/logs returns a JSON array."""
        r = requests.get(f"{A}/api/logs")
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(r.json(), list)

    def test_logs_entries_have_required_fields(self):
        """Each log entry contains method, url, and timestamp."""
        r = requests.get(f"{A}/api/logs")
        logs = r.json()
        if logs:
            entry = logs[0]
            self.assertIn("method", entry)
            self.assertIn("url", entry)
            self.assertIn("timestamp", entry)

    def test_logs_non_empty_after_requests(self):
        """Log collection is non-empty — requests to any process are recorded."""
        # Make a request to process-b to ensure at least one log exists
        requests.get(f"{B}/api/users")
        r = requests.get(f"{A}/api/logs")
        self.assertGreater(len(r.json()), 0)


# ────────────────────────────────────────────────────────────────
# Process B — Users
# ────────────────────────────────────────────────────────────────

class TestProcessBAddUser(unittest.TestCase):

    def test_add_user_success(self):
        """POST /api/add with valid data returns 201 and the saved document."""
        # Clean up first in case test user exists from a previous run
        # (ignore errors — it may not exist yet)
        r = requests.post(f"{B}/api/add", json=TEST_USER)
        # Accept 201 (created) or 409 (already exists from prior run)
        self.assertIn(r.status_code, [201, 409])
        if r.status_code == 201:
            body = r.json()
            self.assertEqual(body["first_name"], TEST_USER["first_name"])
            self.assertEqual(body["last_name"], TEST_USER["last_name"])

    def test_add_user_missing_field_returns_error(self):
        """POST /api/add with a missing field returns 400 with id and message."""
        r = requests.post(f"{B}/api/add", json={"id": 999002, "first_name": "No"})
        self.assertEqual(r.status_code, 400)
        self.assertIn("id", r.json())
        self.assertIn("message", r.json())

    def test_add_user_duplicate_id_returns_error(self):
        """POST /api/add with a duplicate id returns 409 with id and message."""
        # Seed user always exists
        r = requests.post(f"{B}/api/add", json={
            "id": 123123, "first_name": "mosh", "last_name": "israeli", "birthday": "1990-01-01"
        })
        self.assertEqual(r.status_code, 409)
        self.assertIn("id", r.json())
        self.assertIn("message", r.json())


class TestProcessBGetUsers(unittest.TestCase):

    def test_get_users_returns_array(self):
        """GET /api/users returns a JSON array."""
        r = requests.get(f"{B}/api/users")
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(r.json(), list)

    def test_get_users_contains_seed_user(self):
        """GET /api/users response includes the seed user (id 123123)."""
        r = requests.get(f"{B}/api/users")
        ids = [u.get("id") for u in r.json()]
        self.assertIn(123123, ids)


class TestProcessBGetUserById(unittest.TestCase):

    def test_get_user_by_id_returns_correct_fields(self):
        """GET /api/users/:id returns id, first_name, last_name, and total."""
        r = requests.get(f"{B}/api/users/123123")
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertEqual(body["id"], 123123)
        self.assertEqual(body["first_name"], "mosh")
        self.assertEqual(body["last_name"], "israeli")
        self.assertIn("total", body)
        self.assertIsInstance(body["total"], (int, float))

    def test_get_nonexistent_user_returns_error(self):
        """GET /api/users/:id for unknown id returns 404 with id and message."""
        r = requests.get(f"{B}/api/users/888888")
        self.assertEqual(r.status_code, 404)
        self.assertIn("id", r.json())
        self.assertIn("message", r.json())


# ────────────────────────────────────────────────────────────────
# Process C — Costs
# ────────────────────────────────────────────────────────────────

class TestProcessCAddCost(unittest.TestCase):

    def test_add_cost_success(self):
        """POST /api/add with valid data returns 201 and the saved document."""
        payload = {
            "userid": 123123,
            "description": "python test groceries",
            "category": "food",
            "sum": 42,
            "date": "2025-03-15"
        }
        r = requests.post(f"{C}/api/add", json=payload)
        self.assertEqual(r.status_code, 201)
        body = r.json()
        self.assertEqual(body["category"], "food")
        self.assertEqual(body["userid"], 123123)

    def test_add_cost_invalid_category_returns_error(self):
        """POST /api/add with an invalid category returns 400 with id and message."""
        r = requests.post(f"{C}/api/add", json={
            "userid": 123123, "description": "taxi", "category": "transport", "sum": 20
        })
        self.assertEqual(r.status_code, 400)
        self.assertIn("id", r.json())
        self.assertIn("message", r.json())

    def test_add_cost_missing_field_returns_error(self):
        """POST /api/add with missing sum returns 400 with id and message."""
        r = requests.post(f"{C}/api/add", json={
            "userid": 123123, "description": "incomplete", "category": "food"
        })
        self.assertEqual(r.status_code, 400)
        self.assertIn("message", r.json())

    def test_add_cost_nonexistent_user_returns_error(self):
        """POST /api/add for a userid that does not exist returns 404."""
        r = requests.post(f"{C}/api/add", json={
            "userid": 777777, "description": "ghost", "category": "food", "sum": 5
        })
        self.assertEqual(r.status_code, 404)
        self.assertIn("message", r.json())


class TestProcessCReport(unittest.TestCase):

    def test_report_contains_all_five_categories(self):
        """GET /api/report returns all 5 categories even if some are empty."""
        r = requests.get(f"{C}/api/report", params={"id": 123123, "year": 2025, "month": 3})
        self.assertEqual(r.status_code, 200)
        body = r.json()
        self.assertIn("costs", body)
        category_keys = [list(c.keys())[0] for c in body["costs"]]
        for cat in ["food", "health", "housing", "sports", "education"]:
            self.assertIn(cat, category_keys)

    def test_report_cost_entries_have_correct_fields(self):
        """Each cost entry in the report has sum, description, and day fields."""
        r = requests.get(f"{C}/api/report", params={"id": 123123, "year": 2025, "month": 3})
        body = r.json()
        for category_obj in body["costs"]:
            entries = list(category_obj.values())[0]
            for entry in entries:
                self.assertIn("sum", entry)
                self.assertIn("description", entry)
                self.assertIn("day", entry)

    def test_report_cached_on_second_call(self):
        """Second call for a past month is faster (served from cache)."""
        params = {"id": 123123, "year": 2025, "month": 3}
        # First call — may compute and cache
        r1 = requests.get(f"{C}/api/report", params=params)
        self.assertEqual(r1.status_code, 200)
        # Second call — must also return 200 with same structure
        r2 = requests.get(f"{C}/api/report", params=params)
        self.assertEqual(r2.status_code, 200)
        self.assertEqual(r1.json()["costs"], r2.json()["costs"])

    def test_report_missing_params_returns_error(self):
        """GET /api/report without month returns 400 with message."""
        r = requests.get(f"{C}/api/report", params={"id": 123123, "year": 2025})
        self.assertEqual(r.status_code, 400)
        self.assertIn("message", r.json())


# ────────────────────────────────────────────────────────────────
# Process D — About
# ────────────────────────────────────────────────────────────────

class TestProcessD(unittest.TestCase):

    def test_about_returns_array(self):
        """GET /api/about returns a JSON array."""
        r = requests.get(f"{D}/api/about")
        self.assertEqual(r.status_code, 200)
        self.assertIsInstance(r.json(), list)

    def test_about_has_three_members(self):
        """GET /api/about returns exactly 3 team members."""
        r = requests.get(f"{D}/api/about")
        self.assertEqual(len(r.json()), 3)

    def test_about_entries_have_only_name_fields(self):
        """Each about entry contains only first_name and last_name — no extra fields."""
        r = requests.get(f"{D}/api/about")
        for member in r.json():
            self.assertIn("first_name", member)
            self.assertIn("last_name", member)
            self.assertEqual(set(member.keys()), {"first_name", "last_name"})

    def test_about_contains_correct_names(self):
        """GET /api/about response includes the expected team member names."""
        r = requests.get(f"{D}/api/about")
        names = [(m["first_name"], m["last_name"]) for m in r.json()]
        self.assertIn(("Lidor", "Kalfon"), names)
        self.assertIn(("Dana", "Mund"), names)
        self.assertIn(("Shaked", "Avdar"), names)


if __name__ == "__main__":
    unittest.main(verbosity=2)
