# Hierarchy Hub

Employee hierarchy management platform for EPI-USE Africa: manage employees, set reporting lines, explore the org chart and report on staff, with Gravatar profile pictures.

[![CI](https://github.com/Ayush-B99/hierarchyHub/actions/workflows/ci.yml/badge.svg)](https://github.com/Ayush-B99/hierarchyHub/actions/workflows/ci.yml)

## Documentation

All project documents are in [docs/](docs/README.md):

- [Software Requirements Specification (SRS)](docs/srs/SRS.md)
- [Software Architecture Specification (SAS)](docs/sas/SAS.md)
- [Architecture Decision Records](docs/adr/README.md)
- [Technical document](docs/technical/TECHNICAL.md)
- [API contract](docs/api/API.md)
- [User guide](docs/user-guide/USER_GUIDE.md)
- [Roadmap](docs/planning/ROADMAP.md)
- [Design](docs/design/README.md)

## Repository structure

```text
hierarchyHub/
├── apps/
│   ├── api/                  NestJS REST API          (@hierarchy-hub/api)
│   └── web/                  React + Vite SPA         (@hierarchy-hub/web)
├── packages/
│   ├── shared/               Types + Zod schemas used by api and web (@hierarchy-hub/shared)
│   ├── tsconfig/             Shared TypeScript presets (@hierarchy-hub/tsconfig)
│   └── eslint-config/        Shared ESLint presets     (@hierarchy-hub/eslint-config)
├── docs/                     Requirements, architecture, decisions and guides
├── .github/                  CI workflow, CODEOWNERS, templates, Dependabot
├── .husky/                   Git hooks (format staged files, check commit messages)
├── turbo.json                Task pipeline and caching
└── pnpm-workspace.yaml       Workspace packages and the dependency version catalog
```

`apps/` are deployable units. `packages/` are internal libraries consumed by apps; they are never deployed on their own.

## Prerequisites

- Node.js 22.12 or newer (`nvm use` reads `.nvmrc`)
- pnpm 10 (`corepack enable` installs the version pinned in `package.json`)
- [Task](https://taskfile.dev) for the short commands below (`brew install go-task` on macOS)

## Getting started

```bash
task setup   # install dependencies and create .env files
task dev     # start the frontend and backend
```

- Web: http://localhost:5173. Until the real API is built, a mock API answers requests in development ([ADR 0008](docs/adr/0008-frontend-first-with-msw.md)).
- API: http://localhost:3000/api/health

## Common commands

Run `task` on its own to see every command. The main ones:

| Command                                              | What it does                                                 |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| `task dev`                                           | Start the frontend and backend together                      |
| `task web`                                           | Start only the frontend                                      |
| `task api`                                           | Start only the backend                                       |
| `task unit`                                          | Run all unit tests                                           |
| `task unit:web`, `task unit:api`, `task unit:shared` | Run unit tests for one package                               |
| `task watch`                                         | Re-run frontend tests on every change                        |
| `task e2e`                                           | Run end-to-end tests                                         |
| `task integration`                                   | Run integration tests against a real database (from Part 4)  |
| `task test`                                          | Run every test                                               |
| `task check`                                         | Run everything CI runs: format, lint, types, tests and build |
| `task lint`, `task typecheck`, `task format`         | Individual quality checks                                    |
| `task build`                                         | Build every package                                          |
| `task clean`                                         | Remove build output, caches and `node_modules`               |

### Without Task

Every command is a shortcut for a pnpm script, so pnpm works too. For example `pnpm dev`, `pnpm test`, `pnpm lint`, or for one package `pnpm --filter @hierarchy-hub/api test:e2e`. The full list is in `Taskfile.yml`.

## Conventions

See [CONTRIBUTING.md](CONTRIBUTING.md) for branching, commit messages and the pull request process.
