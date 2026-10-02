# Roadmap

The project is built in parts. Each part is one branch and one pull request, made up of small commits.

| Part | What it covers                                                                                  | Branch                       | Status      |
| ---- | ----------------------------------------------------------------------------------------------- | ---------------------------- | ----------- |
| 1    | Monorepo, tooling, git hooks and CI                                                             | `chore/monorepo-setup`       | Done        |
| 2    | Initial documentation: SRS, SAS, ADRs, API contract, technical document and user guide outlines | `docs/initial-documentation` | In progress |
| 3    | Database and shared rules: Prisma, migrations, local PostgreSQL, validation                     | `feat/database`              | Not started |
| 4    | Employee API: add, view, edit, delete, manager rules, tests                                     | `feat/employee-api`          | Not started |
| 5    | Web app: layout, employee table, forms, Gravatar                                                | `feat/web-employees`         | Not started |
| 6    | Org chart and search                                                                            | `feat/org-chart`             | Not started |
| 7    | AWS setup and deployment                                                                        | `feat/aws-deployment`        | Not started |
| 8    | Final user guide, technical document and extras                                                 | `docs/final-documentation`   | Not started |

## Requirements by part

| Part | Requirements                                                      |
| ---- | ----------------------------------------------------------------- |
| 3    | Section 6 of the SRS, BR-01, BR-03, BR-05, BR-06, BR-07, C-01     |
| 4    | FR-01 to FR-06, BR-01 to BR-07, NFR-03, NFR-10                    |
| 5    | FR-01 to FR-06, FR-09, FR-10, FR-13, FR-15                        |
| 6    | FR-07, FR-08, FR-11, FR-12                                        |
| 7    | C-03, NFR-01, NFR-04, NFR-11, NFR-12                              |
| 8    | User guide, technical document, chosen extras from FR-14 to FR-20 |
