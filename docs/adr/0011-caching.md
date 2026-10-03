# 0011. Caching: browser and HTTP caching, no server cache yet

- Status: Accepted
- Date: 2026-10-03

## Context

We want the app to feel fast and keep load on the database low, without ever showing out of date employee data after a change.

## Options

| Option                                      | Pros                                                                                         | Cons                                                                             |
| ------------------------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Browser cache only (TanStack Query)         | Already built. Instant page switches.                                                        | Every new visit fetches everything again.                                        |
| Plus HTTP caching with ETags                | Unchanged data costs a tiny "not modified" reply instead of the full list. No extra servers. | A little work in the API.                                                        |
| Plus a Redis cache in front of the database | Takes load off the database at very high traffic.                                            | Another service to run and pay for. Cache invalidation bugs can show stale data. |

## Decision

- **Browser:** TanStack Query keeps data for 30 seconds and refreshes after every change (built in Part 3).
- **HTTP:** the API sends an ETag (a fingerprint of the data) with responses, built from row versions and `updated_at`. Browsers send it back, and if nothing changed the API answers "304 Not Modified" with no body. `Cache-Control: no-cache` makes browsers always check, so nobody sees stale data (built in Part 5).
- **Database:** indexes on every column we sort, filter or look up by, and a connection pool.
- **No Redis for now.** With up to about 10,000 employees, PostgreSQL answers these queries in a few milliseconds. Redis would add cost and the risk of stale data for no real gain.

## When to revisit

Add a server cache if the organisation grows past roughly 100,000 employees, or if the database's CPU stays above about 60% under normal use.

## Consequences

- Fast repeat visits with very little data transferred.
- Data is always current after a change.
- One fewer moving part to secure and pay for.
