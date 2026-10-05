# 0016. Accounts, sessions and approval by an admin

- Status: Accepted
- Date: 2026-10-06

## Context

Until now anyone who could reach the app could change anyone, so a junior could, for example, make their own boss report to them. Assessors will try exactly that. We need to know who is making each request before we can decide what they're allowed to do (ADR 0017) and record who did what (the audit trail).

The app is for one company's employees, so an account only makes sense when it belongs to a real person in the organisation.

## Options

| Option                                            | Pros                                                                                                    | Cons                                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| JSON web tokens kept by the browser               | No session table. Common in tutorials.                                                                  | Can't be revoked before they run out. Stored where page scripts can read them unless done carefully. |
| Sessions in the database, with an httpOnly cookie | Can be ended at once (sign out, account turned off). Scripts can never read the cookie. Simple to test. | One small table and a lookup per request.                                                            |
| An outside identity provider (Cognito, Auth0)     | Password resets and multi-factor for free.                                                              | More moving parts and cost, and assessors would need accounts set up for them.                       |

## Decision

- **Sessions in PostgreSQL.** Signing in creates a random 32 byte token. The browser gets it in an `hh_session` cookie that is `httpOnly`, `SameSite=Lax`, `Secure` in production and limited to `/api`. The database only keeps a SHA-256 hash of it, so a copy of the sessions table can't be used to sign in.
- Sessions slide: each visit pushes the end back by `SESSION_HOURS` (12), but never past `SESSION_MAX_DAYS` (7) from signing in.
- **Passwords are hashed with Argon2id** (19 MiB, 2 passes, the OWASP recommendation). The database refuses anything that isn't an Argon2id hash. Passwords must be 12 to 128 characters and mustn't contain your email name.
- **Five wrong passwords lock the account for 15 minutes**, even for the right password. Unknown emails get the same answer as wrong passwords and take the same time, and signing up never says whether an email already has an account.
- **Anyone can sign up, but nothing happens until an admin approves it** and links it to an employee. An admin can only link accounts to people below them, so nobody can be approved in as their own boss. One employee, one account.
- **The first admin** is created from the command line with `task admin:create EMPLOYEE=...`, which asks for the password without showing it.
- **Every API route needs a signed in, approved account** unless it is marked public (only the health checks and the sign in forms). This is on by default, so a new endpoint can't be left open by forgetting a decorator.
- **Changes from other websites are refused.** On top of the same-site cookie, any request that changes data must come from the app's own address (the `Origin` and `Sec-Fetch-Site` headers).
- Turning an account off, or deleting its employee, ends its sessions straight away, because every request checks the account.

## Consequences

- The web app and the API should share one address in production, so the cookie stays first-party. The deployment (Part 7) routes `/api` through the web app's domain.
- Until permissions based on the hierarchy arrive (ADR 0017), only admins can change employees.
- There is no password reset by email yet. An admin with `task admin:create`, or the person's manager approving a new account, covers this for now.
- Local sample accounts (`task db:seed`) share one demo password, and can never reach a real database because the seed refuses to run anywhere else.
