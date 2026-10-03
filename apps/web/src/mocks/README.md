# Mock API (tests, and optional for development)

These files fake the REST API from `docs/api/API.md` using [MSW](https://mswjs.io/). They were used to build the frontend before the real API existed ([ADR 0008](../../../../docs/adr/0008-frontend-first-with-msw.md)). Now they're used for:

- **Frontend tests.** Every web test runs against this mock, so the tests are fast and need no database.
- **Working on screens without the backend**, with `task web:mock`.

`task dev` and `task web` use the **real** API.

## Files

- `handlers.ts` implements every endpoint, including the business rules and the version checks (`If-Match`, 412 and 428).
- `db.ts` holds the data in memory. It resets when the page reloads.
- `seed.ts` is the same 14 sample people as `apps/api/prisma/seed-data.ts`.

## Keeping it honest

`contract.test.ts` runs the shared examples in `packages/shared/src/testing` against this mock. The real API's end-to-end tests run the very same examples, so if the mock and the API ever behave differently, a test fails.

## Never in production

`main.ts` only loads the mock when `import.meta.env.DEV` is true and `VITE_API_MOCKING=true`, so Vite removes it from production builds. The deployed app always talks to the real API and database (SRS constraint C-01).
