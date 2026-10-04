# Roadmap

The project is built in parts. Each part is one branch and one pull request, made up of small commits. We build the frontend first against a mock API ([ADR 0008](../adr/0008-frontend-first-with-msw.md)), then the backend.

| Part | What it covers                                                                              | Branch                       | Status      |
| ---- | ------------------------------------------------------------------------------------------- | ---------------------------- | ----------- |
| 1    | Monorepo, tooling, git hooks and CI                                                         | `chore/monorepo-setup`       | Done        |
| 2    | Initial documentation                                                                       | `docs/initial-documentation` | Done        |
| 3a   | Frontend foundation: design tokens, themes, UI components, 3D background, routing, mock API | `feat/web-foundation`        | Done        |
| 3b   | Explore page: Orbit and Levels views, path to the top, details panel                        | `feat/web-explore`           | Done        |
| 3c   | People page: sentence filters and sortable table                                            | `feat/web-people`            | Done        |
| 3d   | Add and edit forms, manager rules, delete confirmation                                      | `feat/web-forms`             | Done        |
| 3e   | Search, React Bits effects and polish                                                       | `feat/web-polish`            | Done        |
| 4a   | Database: local PostgreSQL, table, rules, users, migrations, integration tests              | `feat/database`              | Done        |
| 4b   | Connect the API to the database securely, sample data for local work                        | `feat/database-access`       | Done        |
| 5a   | Employee API, reading: list, filters, sorting, paging, hierarchy, caching                   | `feat/api-read`              | Done        |
| 5b   | Employee API, changes: create, update, delete, clashing edits, security layer               | `feat/api-write`             | Done        |
| 5c   | Switch the frontend from the mock to the real API                                           | `feat/web-real-api`          | Done        |
| 5d   | Rotating 3D Orbit view, drag to spin, moons for team size                                   | `feat/orbit-3d`              | Done        |
| 5e   | Bring every document in line with the brief and the built app                               | `docs/match-the-brief`       | Done        |
| 6    | AWS setup and deployment                                                                    | `feat/aws-deployment`        | Not started |
| 7    | Final pass: live URL, deployment details and fresh screenshots                              | `docs/final-documentation`   | Not started |

## Requirements by part

| Part | Requirements                                                 |
| ---- | ------------------------------------------------------------ |
| 3a   | FR-15, NFR-07, NFR-08                                        |
| 3b   | FR-02, FR-07, FR-08, FR-11                                   |
| 3c   | FR-09, FR-10, FR-13, FR-14                                   |
| 3d   | FR-01, FR-03 to FR-06, BR-01, BR-02, BR-04                   |
| 3e   | FR-08, FR-12                                                 |
| 4    | SRS section 6, BR-01, BR-03, BR-05, BR-06, C-01              |
| 5    | FR-01 to FR-06, FR-21, FR-22, BR-01 to BR-07, NFR-03, NFR-10 |
| 6    | C-03, NFR-01, NFR-04, NFR-11, NFR-12                         |
| 7    | User guide, technical document, C-03                         |
