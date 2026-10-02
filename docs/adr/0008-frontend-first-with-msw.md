# 0008. Build the frontend first, against a mock API

- Status: Accepted
- Date: 2026-10-02

## Context

We want to design and build the screens before the database and API exist. The screens need realistic data and the real API rules (no self-management, no loops) to behave properly. The brief does not allow mocked data in the delivered solution (SRS constraint C-01).

## Options

| Option                             | Pros                                                                                               | Cons                                     |
| ---------------------------------- | -------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| Build the API first                | No mocks needed.                                                                                   | Slower to see and test the design.       |
| Hardcode sample data in components | Quick.                                                                                             | Breaks C-01. Has to be ripped out later. |
| Mock Service Worker (MSW)          | Intercepts real `fetch` calls, so the app code is exactly what ships. The same mocks run in tests. | One more tool.                           |

## Decision

Use MSW. The handlers in `apps/web/src/mocks` implement the API contract (`docs/api/API.md`), including the business rules, using the shared validation package.

- Mocks only load when `import.meta.env.DEV` is true, so Vite removes them from production builds.
- Developers can switch them off with `VITE_API_MOCKING=false`.
- Tests use the same handlers through `msw/node`.

## Consequences

- The frontend can be finished and tested before the backend.
- The handlers act as a working example of the API contract for building the real API.
- The deployed app never contains mock data, so C-01 is respected.
- The mock and real API must be kept in step. The handler tests help catch differences.
