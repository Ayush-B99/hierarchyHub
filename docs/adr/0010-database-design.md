# 0010. Database design: rules in the database, two users, version numbers

- Status: Accepted
- Date: 2026-10-03

## Context

Employee data is the heart of the app. If the API ever has a bug, the data must still stay correct. We also need to stop two people overwriting each other's edits, and limit the damage if the API is ever compromised.

## Decision

**The database enforces the business rules itself**, not just the API:

| Rule                                                               | How                                                                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------- |
| Nobody manages themselves (BR-01)                                  | Check constraint                                                                            |
| No reporting loops (BR-02)                                         | A trigger walks up the chain on every manager change                                        |
| Salary not negative (BR-06), realistic birth date, names not blank | Check constraints                                                                           |
| Birth date in the past (BR-07)                                     | The same trigger (check constraints can't use today's date)                                 |
| Unique email and employee number, ignoring capitals (BR-05)        | Stored in one case (enforced by checks), with unique indexes                                |
| A manager can't be deleted while people report to them (BR-04)     | `ON DELETE NO ACTION` foreign key. The API moves the team up first, in the same transaction |

**Clashing manager changes.** Two changes made at the same instant (A reports to B, and B reports to A) could each pass the loop check before the other is saved. The trigger takes a short transaction lock before checking, so manager changes are checked one at a time. Normal edits aren't affected.

**Clashing edits.** Every row has a `version` that the database increases on every change. The API saves with "only if the version is still what I loaded". If someone else saved first, nothing is overwritten and the user is told.

**Two database users** (least privilege):

| User          | Can do                                          | Used by                         |
| ------------- | ----------------------------------------------- | ------------------------------- |
| `hh_migrator` | Owns the tables, can change their structure     | Migrations, only when deploying |
| `hh_app`      | Read, add, change and delete rows. Nothing else | The API, day to day             |

`hh_app` also has a 5 second query limit, lock and idle limits, and a connection cap, so one bad request can't hold up the database.

**Prisma** is the tool the API uses to talk to the database. The rules above live in the migration SQL, because Prisma can't describe checks or triggers. CI applies the migrations to a real PostgreSQL, checks that `schema.prisma` still matches it exactly, and runs integration tests that try to break every rule.

## Consequences

- The data stays valid even if the API has a bug or someone edits rows directly.
- A compromised API password can't drop or change tables.
- The database returns a clear error code and rule name for each broken rule, which the API turns into friendly messages.
- The rules exist in two places (shared validation and the database). The integration tests keep them honest.
- The loop check walks up the chain, which takes a few milliseconds even for deep organisations.
