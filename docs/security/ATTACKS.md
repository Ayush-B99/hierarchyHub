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

## Attacks on permissions

With permissions based on the hierarchy (ADR 0017), we tried every rule from every position in the sample organisation. All of these are tests in `apps/api/test/permissions.e2e-spec.ts`.

| Attack                                                                              | Result                                                                             |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| A junior making their manager, or the CEO, report to them                           | 403. Nobody can change anyone above them                                           |
| Giving yourself a raise, promoting yourself, or choosing your own manager           | 403, naming each field you can't change. About yourself, only your name and email  |
| Changing your own employee number or birth date                                     | 403                                                                                |
| Changing someone beside you, or in a colleague's team                               | 403, even as an admin                                                              |
| Moving someone in your team out of your reach, or under someone senior              | 403 on the manager field                                                           |
| Putting someone at the top of the organisation without being at the top             | 403                                                                                |
| A manager who isn't an admin adding or deleting people                              | 403                                                                                |
| An admin adding people outside their part of the organisation                       | 403                                                                                |
| Deleting the CEO, or yourself                                                       | 403                                                                                |
| Making yourself an admin, or removing the admin role from someone senior            | 403. Admins can only manage the accounts of people below them                      |
| Reading colleagues' or your boss's salary and birth date                            | Sent back as `null`, in the org chart, the list and when opening one person        |
| Guessing salaries with `salaryMin`, `salaryMax` or sorting by salary                | Those filters only ever include you and the people below you                       |
| Guessing birth dates with date filters or sorting by birth date                     | The same                                                                           |
| Moving someone out of a manager's reach at the same moment the manager changes them | Only one change wins. Checks run under the same lock as the reporting loop trigger |
| A shared cache serving one person's view to someone else                            | Reads are `Cache-Control: private` with `Vary: Cookie`                             |
| A turned off account carrying on with an open session                               | Signed out straight away                                                           |

## Still open, fixed in the next part

- **Nobody can see who changed what.** An audit trail fixes this.
