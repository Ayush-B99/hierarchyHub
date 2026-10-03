# 0012. Run Prisma through our own node-postgres pool

- Status: Accepted
- Date: 2026-10-03

## Context

Prisma normally runs queries through a separate engine binary that's downloaded when installing. We need control over how the API connects to the database: pool size, timeouts, and encrypted connections that verify the server's certificate. A smaller Docker image is also welcome.

## Options

| Option                                            | Pros                                                                                                                                                                                          | Cons                                                                                                                                 |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Prisma's default engine binary                    | The long-standing default.                                                                                                                                                                    | An extra binary to download and ship. Less direct control over the connection pool and TLS.                                          |
| Prisma's "Rust-free" client with the `pg` adapter | Queries are built by a small WebAssembly module that ships with the npm package. We pass in our own `pg` pool, so we set the size, timeouts and TLS ourselves. No engine binary in the image. | Newer approach. Some errors arrive in a slightly different shape (handled in `database-errors.ts` and covered by integration tests). |

## Decision

Use the Rust-free client (`engineType = "client"`) with `@prisma/adapter-pg`. The API creates one `pg` pool from validated settings:

| Setting                       | Default                                                | Why                                                                                            |
| ----------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `DATABASE_POOL_MAX`           | 10 per instance                                        | The app user is capped at 40 connections, leaving room for several instances plus admin access |
| `DATABASE_CONNECT_TIMEOUT_MS` | 5000                                                   | Fail fast instead of hanging a request                                                         |
| `DATABASE_SSL`                | `disable` locally, must be `verify-full` in production | Encrypted, and the server must prove it's our database                                         |
| `DATABASE_SSL_CA_FILE`        | none                                                   | The certificate bundle to trust (AWS RDS's in production)                                      |

Prisma's own logging is switched off, because database errors can contain whole rows, salaries included. A single exception filter logs a safe summary (route, status, rule name) instead.

## Consequences

- One shared, bounded connection pool, with timeouts and verified encryption.
- The API won't start in production without verified encryption, and won't start at all if it can't reach the database.
- Prisma migrations still use the schema engine, run by the migrator user during deploys (ADR 0010).
- Integration tests run every database rule through the real client, so a change in Prisma's error shapes is caught before release.
