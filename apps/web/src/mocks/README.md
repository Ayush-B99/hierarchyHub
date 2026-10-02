# Mock API (development and tests only)

These files fake the REST API from `docs/api/API.md` using [MSW](https://mswjs.io/), so the frontend can be built before the real API exists.

- `handlers.ts` implements every endpoint, including the business rules (no self-management, no reporting loops, reassigning reports on delete).
- `db.ts` holds the data in memory. It resets when the page reloads.
- `seed.ts` is sample data for local development.

**This never runs in production.** `main.tsx` only loads it when `import.meta.env.DEV` is true, so Vite removes it from production builds. The deployed app always talks to the real API and database (SRS constraint C-01).

To use the real API locally instead, set `VITE_API_MOCKING=false` in `apps/web/.env`.
