# 0002. Use TypeScript with React and NestJS

- Status: Accepted. The React Flow and TanStack Table choices were replaced by [0014](0014-custom-org-chart-and-table.md)
- Date: 2026-10-02

## Context

We need an interactive web app (org chart, table, forms) and an API with clear business rules.

## Options

| Option                            | Pros                                                                                                                        | Cons                                                                           |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Next.js for everything            | One framework.                                                                                                              | Mixes frontend and backend. Harder to host the frontend as plain static files. |
| React with a Python (FastAPI) API | FastAPI is simple and fast.                                                                                                 | Two languages. Types cannot be shared.                                         |
| Angular with a .NET API           | Strong structure.                                                                                                           | Two languages. Heavier setup.                                                  |
| React (Vite) with a NestJS API    | One language. Types are shared. React has the best libraries for charts and tables. NestJS gives the API a clear structure. | Two apps to deploy.                                                            |

## Decision

- Web app: React with Vite. TanStack Query for loading data, React Router for pages, React Flow for the org chart, TanStack Table for the employee table.
- API: NestJS with Prisma to talk to the database.
- TypeScript everywhere.

## Consequences

- Types flow from the database, through the API, to the screens.
- Vite builds the web app into static files that are cheap and easy to host.
- NestJS modules, dependency injection and testing tools keep the API easy to read and test.
- The API and web app are deployed separately, so each can be updated on its own.
