# 0001. Use a monorepo with pnpm and Turborepo

- Status: Accepted
- Date: 2026-10-02

## Context

The project has a web app, an API, shared code and, later, cloud setup code. The web app and API must agree on the shape of an employee. The assessors need one repository link.

## Options

| Option                                      | Pros                                                                           | Cons                                                                                                      |
| ------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| Two separate repositories                   | Each app is fully independent.                                                 | Shared types must be copied or published. Two links to share. Changes across both need two pull requests. |
| One repository, no workspace tools          | Simple to start.                                                               | No clear boundaries. Slow builds as the project grows.                                                    |
| Monorepo with pnpm workspaces and Turborepo | One repository, clear packages, shared code used directly, fast cached builds. | A few more tools to learn.                                                                                |

## Decision

Use one repository with pnpm workspaces and Turborepo. Deployable apps go in `apps/`. Internal libraries go in `packages/`. Shared TypeScript and ESLint settings are their own packages so every app follows the same rules.

## Consequences

- One change can update the API, the web app and the shared rules together.
- If a shared type changes, every place that uses it fails to build until it is fixed. Mistakes are caught early.
- Turborepo only rebuilds what changed, so checks stay fast.
- pnpm is strict about dependencies, so a package cannot use a library it has not declared.
