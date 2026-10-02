# 0003. Store the hierarchy in PostgreSQL as an adjacency list

- Status: Accepted
- Date: 2026-10-02

## Context

We need to store who reports to whom. Managers change often. Users must be able to sort and filter on every field. Nobody can manage themselves, and reporting loops must never happen.

## Options

| Option                                            | Reading a whole team | Changing a manager  | Notes                                                            |
| ------------------------------------------------- | -------------------- | ------------------- | ---------------------------------------------------------------- |
| Adjacency list (each row stores its `manager_id`) | Recursive query      | Update one row      | Simplest.                                                        |
| Nested sets                                       | Very fast            | Update many rows    | Complex to maintain.                                             |
| Closure table                                     | Fast                 | Update many rows    | Needs an extra table.                                            |
| Path column (for example `ltree`)                 | Fast                 | Update a whole team | Paths must be kept in sync.                                      |
| Graph database                                    | Built in             | Built in            | Expensive. Weak at table-style sorting and filtering.            |
| Document database (Firestore, DynamoDB)           | Done in code         | Update one document | Cannot enforce relationships. Sorting on many fields is awkward. |

## Decision

Use PostgreSQL. Each employee row has an optional `manager_id` that points to another employee.

- A check constraint stops `manager_id` from equalling `id`.
- A foreign key makes sure the manager exists.
- Before a manager change, the API runs a recursive query that walks up from the new manager. If it reaches the employee being edited, the change is refused.

## Consequences

- Changing a manager, the most common change, updates one row.
- The database protects the data even if there is a bug in the code.
- SQL indexes make sorting and filtering on any field easy.
- The org chart is loaded with one query and built in the browser. This is fast for our expected size of up to 10,000 employees.
- If two users change managers at exactly the same moment, a loop could slip through. This is very unlikely here. A database trigger can be added later if needed.
