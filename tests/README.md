# Backend Tests

This project uses Node's built-in test runner, so no extra test framework is required.

## Run the tests

1. Open a terminal in `back/`
2. Run `npm test`

## What is covered

- `tests/auth/admin-login.test.js`
  Verifies the admin login flow returns a successful response and sets the session cookie.
- `tests/api/admin-stats.test.js`
  Verifies the optimized `GET /api/admin/stats` endpoint returns count-only dashboard data.

## Test setup notes

- The tests set `NODE_ENV=test` automatically.
- Database access is stubbed, so MongoDB does not need to be running.
- The Express app is exercised through a real HTTP server started on a random local port.
- Auth and service dependencies are mocked only where needed so route/controller behavior stays realistic.
