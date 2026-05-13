# Cost Manager

A RESTful cost-management API built with Node.js, Express, Mongoose, and MongoDB Atlas.

## Team

| Name | Role |
|---|---|
| Lidor Kalfon | Team Manager |
| Dana Mund | Member |

## Goal

Build four independent server processes that together form a cost-tracking system. Each process handles a distinct responsibility and runs on its own port, communicating with a shared MongoDB Atlas database.

## Processes & Endpoints

| Process | Port | Endpoints |
|---------|------|-----------|
| A — Logs | 3001 | `GET /api/logs` |
| B — Users | 3002 | `POST /api/add`, `GET /api/users`, `GET /api/users/:id` |
| C — Costs | 3003 | `POST /api/add`, `GET /api/report` |
| D — About | 3004 | `GET /api/about` |

## Features

- **User management** — add users and retrieve individual totals across all their costs
- **Cost tracking** — log expenses by category (`food`, `health`, `housing`, `sports`, `education`)
- **Monthly reports** — grouped cost breakdowns per user with Computed Design Pattern caching for past months
- **Request logging** — every HTTP request and endpoint access is persisted to MongoDB via Pino middleware
- **Team info** — returns developer names from environment variables, not the database

## Stack

- Node.js + Express
- Mongoose + MongoDB Atlas
- Pino (structured logging)
- dotenv
- Jest + Supertest (unit tests)

## Running Locally

Start each process from its own folder so `.env` is loaded correctly:

```bash
(cd process-a && node app.js) &
(cd process-b && node app.js) &
(cd process-c && node app.js) &
(cd process-d && node app.js) &
```

Run unit tests:

```bash
for dir in process-a process-b process-c process-d; do
  (cd $dir && npm test)
done
```

Run integration tests (requires all four processes running):

```bash
python3 tests.py
```
