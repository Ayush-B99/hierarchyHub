# 0013. API security layer

- Status: Accepted
- Date: 2026-10-03

## Context

The API will be on a public URL, and in the first version there's no login (FR-17 is an optional extra). It holds personal data, including salaries. We need sensible protection against common attacks and accidents, without getting in the way of normal use.

## Decision

| Protection       | How                                                                                                                                              | Why                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Security headers | Helmet: `nosniff`, `SAMEORIGIN` framing, strict transport security, a content security policy, no `X-Powered-By`                                 | Blocks content sniffing and clickjacking, forces HTTPS, hides what we run  |
| CORS             | Only the web app's own address                                                                                                                   | Other websites can't call the API from a visitor's browser                 |
| Rate limits      | Per IP address, per minute: 300 reads, 60 changes, counted separately. 429 with a standard `Retry-After` header. Health checks are never limited | One script can't flood the database, normal use is never affected          |
| Real visitor IPs | `TRUST_PROXY` set to the number of proxies in front (2 on AWS: CloudFront and the load balancer)                                                 | Without it every visitor looks like the load balancer and shares one limit |
| Request size     | JSON only, at most 16 KB (an employee is under 1 KB). 413 if larger                                                                              | Nobody can tie the API up with huge uploads                                |
| Strict input     | Every body and query is checked with the shared rules. Unknown fields are refused, so `id` or `version` can't be set by a client                 | Bad or sneaky input never reaches the database                             |
| Clashing edits   | Changes need `If-Match` with the version you loaded. 428 without it, 412 if someone else saved first                                             | Nobody silently overwrites someone else's work                             |
| Request IDs      | Every request gets an `X-Request-Id`, echoed back and written to the logs. A caller's own id is kept only if it's safe                           | Problems can be traced to one exact request                                |
| Logs             | Method, path, status, time and request id only. Never the query string, request body or database error text                                      | Searches and errors can contain names and salaries                         |

## Consequences

- The API is reasonably protected on a public URL, even before login exists.
- Rate limits are counted per API instance, in memory. With more instances, the effective limit grows with them. A shared store (for example Redis) would be needed for exact limits across many instances, which isn't worth it at this scale.
- Clients must send `If-Match` on changes. The web app does this from Part 5c.
