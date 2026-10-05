# Security Testing

Before adding accounts and permissions, we attacked the app the way an assessor would: calling the API directly with values the form would never send, skipping the safety checks, and racing changes against each other. This page records every attack, what happened, and what changed.

Every attack is now an automated test in `apps/api/test/attacks.e2e-spec.ts`, run against a real PostgreSQL database on every pull request, so none of these can come back unnoticed.

## What we found and fixed

| Attack                                                           | What happened before                            | Now                                                                              |
| ---------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------- |
| Birth date `1990-02-30`, a date that doesn't exist               | Saved, quietly shifted to 2 March               | Refused: "That date doesn't exist"                                               |
| Someone born yesterday                                           | Saved                                           | Refused: employees must be at least 15 (BR-07), in the API and the database      |
| Salary `null`, `""` or `true`                                    | Saved as 0, 0 and 1                             | Refused: "Enter a number". Text typed into the form, like `"72000"`, still works |
| A NUL byte in a name                                             | 500 error                                       | Refused: "Remove hidden or control characters"                                   |
| A right to left override (`evil‮txt.exe`) or zero width spaces   | Saved, so a name could look blank or spoofed    | Refused, for every name, role and email                                          |
| A 300 character email                                            | 500 error                                       | Refused: emails can be at most 254 characters                                    |
| Filter `bornAfter=2026-13-45`                                    | 500 error                                       | Refused: "That date doesn't exist"                                               |
| `If-Match: *` on a change                                        | **Saved**, skipping the clash check             | Refused. A change must name the exact version it was made from                   |
| `If-Match: W/"v1"` (a weak tag)                                  | Saved                                           | Refused                                                                          |
| A minimum salary above the maximum, or birth dates the wrong way | An empty list with no explanation               | Refused, saying which range is wrong                                             |
| A 10,000 character search, or a NUL byte in a search             | Ran the query anyway                            | Refused: searches are at most 100 characters, with no hidden characters          |
| `page=1e308`                                                     | The number overflowed and odd results came back | Refused: pages go up to 100,000                                                  |

As a safety net, any value the database itself refuses (Postgres "data exception" errors) now becomes a clear 400 instead of a 500. The database's own wording is never passed on, because it can quote the value.

## What already held

| Attack                                                | Result                                                                         |
| ----------------------------------------------------- | ------------------------------------------------------------------------------ |
| Making the CEO report to someone in their own team    | Refused as a reporting loop, by the API and the database                       |
| Two opposite manager changes fired at the same moment | Exactly one wins, the other is refused (the database trigger takes a lock)     |
| `__proto__` hidden in the request body                | Refused as an unknown field                                                    |
| Unknown fields like `id`, `version` or `isAdmin`      | Refused                                                                        |
| `%` and `_` in a search, which are SQL wildcards      | Treated as plain text                                                          |
| HTML in a name or role (`<img onerror=...>`)          | Stored as plain text and shown as text. React never inserts it as HTML         |
| A spreadsheet formula as a name (`=HYPERLINK(...)`)   | Stored as text. The CSV export puts `'` in front, so spreadsheets don't run it |
| A parameter given twice (`?role=a&role=b`)            | Refused                                                                        |
| A JSON body sent as `text/plain`                      | Refused                                                                        |
| An empty change (`{}`)                                | Refused: "Send at least one field to change"                                   |
| Mixed case and spaces in emails and employee numbers  | Tidied up, so `EMP-1` and `emp-1` count as the same                            |

## Attacks on signing in

Once accounts arrived (ADR 0016), we attacked those too. All of these are tests in `apps/api/test/accounts.e2e-spec.ts`.

| Attack                                                                | Result                                                                                             |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Calling any employee or account endpoint without signing in           | 401                                                                                                |
| A made up, empty or tampered session cookie                           | 401                                                                                                |
| Guessing a password                                                   | Locked for 15 minutes after 5 wrong tries, even for the right password. Plus the rate limit per IP |
| Telling real emails from made up ones by the error or the timing      | Same message, and an unknown email is checked against a dummy hash so it takes as long             |
| Finding out who has an account by signing up with their email         | Everyone gets the same answer, and nothing changes for an existing email                           |
| Signing up with `isAdmin`, `status` or `employeeId` in the body       | Refused as unknown fields                                                                          |
| A 10,000 character password, to make hashing slow                     | Refused before hashing (at most 128 characters)                                                    |
| Signing in to an account nobody has approved                          | 403, and no cookie is set                                                                          |
| Reading the session cookie from a page script                         | It's `httpOnly`                                                                                    |
| Using a session after signing out, or after the account is turned off | 401 straight away. Every request checks the account                                                |
| A copied sessions table                                               | Useless: only SHA-256 hashes of the cookies are stored                                             |
| Approving yourself in as your boss, or as someone above you           | 403: an admin can only link accounts to people below them                                          |
| Linking two accounts to one employee                                  | 409                                                                                                |
| Two admins approving the same request at the same moment              | One wins, the other gets 409                                                                       |
| Someone who isn't an admin approving accounts or changing employees   | 403                                                                                                |
| Another website making changes with a signed in person's cookie       | 403, from the `Origin` and `Sec-Fetch-Site` checks, on top of the same-site cookie                 |
| A sign in link like `?next=https://evil.example`                      | Ignored: after signing in you only ever go to a page inside the app                                |

## Still open, fixed in the next parts

These need accounts, so they're covered by the next steps of the build:

- **Any admin can change anyone.** Everyone now signs in, and only admins can make changes, but an admin can still change people above or beside them. Permissions based on the hierarchy (ADR 0017) fix this.
- **Everyone sees every salary and birth date.** These will only be shown to the person themselves and the people above them, filtered by the API. Filtering and sorting by salary or birth date will only use the people you're allowed to see, so the filters can't be used to guess someone's salary.
- **Nobody can see who changed what.** An audit trail fixes this.
