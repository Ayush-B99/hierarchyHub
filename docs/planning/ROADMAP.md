# Roadmap

The project is built in parts. Each part is one branch and one pull request, made up of small commits. We build the frontend first against a mock API ([ADR 0008](../adr/0008-frontend-first-with-msw.md)), then the backend.

| Part | What it covers                                                                              | Branch                       | Status      |
| ---- | ------------------------------------------------------------------------------------------- | ---------------------------- | ----------- |
| 1    | Monorepo, tooling, git hooks and CI                                                         | `chore/monorepo-setup`       | Done        |
| 2    | Initial documentation                                                                       | `docs/initial-documentation` | Done        |
| 3a   | Frontend foundation: design tokens, themes, UI components, 3D background, routing, mock API | `feat/web-foundation`        | In progress |
| 3b   | Explore page: Orbit and Levels views, path to the top, details panel                        | `feat/web-explore`           | Not started |
| 3c   | People page: sentence filters and sortable table                                            | `feat/web-people`            | Not started |
| 3d   | Add and edit forms, manager rules, delete confirmation                                      | `feat/web-forms`             | Not started |
| 3e   | Search, React Bits effects and polish                                                       | `feat/web-polish`            | Not started |
| 4    | Database and Prisma                                                                         | `feat/database`              | Not started |
| 5    | Employee API                                                                                | `feat/employee-api`          | Not started |
| 6    | AWS setup and deployment                                                                    | `feat/aws-deployment`        | Not started |
| 7    | Final user guide, technical document and extras                                             | `docs/final-documentation`   | Not started |

## Requirements by part

| Part | Requirements                                    |
| ---- | ----------------------------------------------- |
| 3a   | FR-15, NFR-07, NFR-08                           |
| 3b   | FR-02, FR-07, FR-08, FR-11                      |
| 3c   | FR-09, FR-10, FR-13, FR-14                      |
| 3d   | FR-01, FR-03 to FR-06, BR-01, BR-02, BR-04      |
| 3e   | FR-08, FR-12                                    |
| 4    | SRS section 6, BR-01, BR-03, BR-05, BR-06, C-01 |
| 5    | FR-01 to FR-06, BR-01 to BR-07, NFR-03, NFR-10  |
| 6    | C-03, NFR-01, NFR-04, NFR-11, NFR-12            |
| 7    | User guide, technical document, chosen extras   |
