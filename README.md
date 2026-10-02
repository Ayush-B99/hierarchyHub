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

## Getting started

```bash
corepack enable
pnpm install
cp apps/api/.env.example apps/api/.env
pnpm dev
```

- Web: http://localhost:5173 (shows "API online" when the API is up)
- API: http://localhost:3000/api/health

## Scripts

Run from the repository root. Turborepo runs each task in every package that defines it, in dependency order, and caches results.

| Command                             | What it does                                     |
| ----------------------------------- | ------------------------------------------------ |
| `pnpm dev`                          | Start web and API with hot reload                |
| `pnpm build`                        | Build all packages                               |
| `pnpm lint`                         | ESLint                                           |
| `pnpm typecheck`                    | TypeScript, no output                            |
| `pnpm test`                         | Unit tests (Vitest for web/shared, Jest for API) |
| `pnpm format` / `pnpm format:check` | Prettier                                         |
| `pnpm clean`                        | Remove build output and `node_modules`           |

Run a task for one package with a filter, e.g. `pnpm --filter @hierarchy-hub/api test:e2e`.

## Conventions

See [CONTRIBUTING.md](CONTRIBUTING.md) for branching, commit messages and the pull request process.
