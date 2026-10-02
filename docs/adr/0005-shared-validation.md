# 0005. Share validation rules between web app and API

- Status: Accepted
- Date: 2026-10-02

## Context

Input must be checked in the browser so users get instant feedback, and on the server because the browser cannot be trusted. Writing the rules twice means they can drift apart.

## Options

| Option                                   | Pros                                                       | Cons                             |
| ---------------------------------------- | ---------------------------------------------------------- | -------------------------------- |
| Separate rules in each app               | Each app can use its usual tools.                          | Rules drift apart over time.     |
| NestJS `class-validator` in the API only | Standard NestJS approach.                                  | The web app cannot reuse it.     |
| Zod rules in the shared package          | One set of rules, used by both. Types come from the rules. | OpenAPI docs need an extra step. |

## Decision

Write the rules once with Zod in `packages/shared`. The API checks every request with them. The web forms use the same rules. TypeScript types are created from the rules, so they always match.

## Consequences

- A rule changes in one place and both apps follow.
- The web app and API can never disagree on what a valid employee is.
- If we want OpenAPI docs later, we will add a library such as `nestjs-zod`.
