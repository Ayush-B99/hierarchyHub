# Architecture Decision Records (ADRs)

An ADR is a short note that records one important decision: the problem, the options, what we chose, and what that means for the project. Once accepted, an ADR is not edited. If a decision changes, write a new ADR that replaces the old one.

To add one, copy [template.md](template.md) and give it the next number.

| No.                                              | Decision                                                           | Status   |
| ------------------------------------------------ | ------------------------------------------------------------------ | -------- |
| [0001](0001-monorepo.md)                         | Use a monorepo with pnpm and Turborepo                             | Accepted |
| [0002](0002-react-and-nestjs.md)                 | Use TypeScript with React and NestJS                               | Accepted |
| [0003](0003-postgresql-adjacency-list.md)        | Store the hierarchy in PostgreSQL as an adjacency list             | Accepted |
| [0004](0004-aws-hosting.md)                      | Host on AWS with Amplify, ECS Fargate and RDS                      | Accepted |
| [0005](0005-shared-validation.md)                | Share validation rules between web app and API                     | Accepted |
| [0006](0006-gravatar.md)                         | Build Gravatar links in the browser                                | Accepted |
| [0007](0007-git-workflow.md)                     | Use trunk-based development                                        | Accepted |
| [0008](0008-frontend-first-with-msw.md)          | Build the frontend first, against a mock API                       | Accepted |
| [0009](0009-visual-design-system.md)             | Clay and glass visual design, with a Three.js background           | Accepted |
| [0010](0010-database-design.md)                  | Database design: rules in the database, two users, version numbers | Accepted |
| [0011](0011-caching.md)                          | Caching: browser and HTTP caching, no server cache yet             | Accepted |
| [0012](0012-prisma-client-with-pg-pool.md)       | Run Prisma through our own node-postgres pool                      | Accepted |
| [0013](0013-api-security-layer.md)               | API security layer                                                 | Accepted |
| [0014](0014-custom-org-chart-and-table.md)       | Build the org chart views and the employee table ourselves         | Accepted |
| [0015](0015-docs-site.md)                        | Publish the docs as a website with MkDocs on GitHub Pages          | Accepted |
| [0016](0016-accounts-and-sessions.md)            | Accounts, sessions and approval by an admin                        | Accepted |
| [0017](0017-permissions-follow-the-hierarchy.md) | Permissions follow the hierarchy                                   | Accepted |
| [0018](0018-audit-trail.md)                      | An append only audit trail                                         | Accepted |
| [0019](0019-pay-check.md)                        | A pay check that learns from the organisation                      | Accepted |
| [0020](0020-time-travel.md)                      | Time travel through the organisation                               | Accepted |
| [0021](0021-deployment.md)                       | Deploying to AWS on one address                                    | Accepted |
