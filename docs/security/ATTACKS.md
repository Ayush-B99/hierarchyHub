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

## Still open, fixed in the next parts

These need accounts, so they're covered by the next steps of the build:

- **Anyone can change anyone.** There is no login yet, so the API can't tell a junior from the CEO. Accounts and permissions based on the hierarchy fix this.
- **Everyone sees every salary and birth date.** These will only be shown to the person themselves and the people above them, filtered by the API. Filtering and sorting by salary or birth date will only use the people you're allowed to see, so the filters can't be used to guess someone's salary.
- **Nobody can see who changed what.** An audit trail fixes this.
