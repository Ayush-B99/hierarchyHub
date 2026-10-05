# 0018. An append only audit trail

- Status: Accepted
- Date: 2026-10-07

## Context

With accounts (ADR 0016) and permissions (ADR 0017), several people change the organisation. Assessors, and any real HR team, will ask: who changed this, when, and what was it before? A trail is only worth having if it can't be quietly edited, if it never shows something that didn't happen, and if it doesn't become a back door around salary privacy.

## Options

| Option                                             | Pros                                                     | Cons                                                                                                 |
| -------------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Write to the logs                                  | Already there.                                           | Logs never hold personal data (NFR-05), aren't searchable in the app, and are deleted after a while. |
| Database triggers that copy every row change       | Catches every change, even ones made outside the API.    | Doesn't know who was signed in or why, and turns one move into many confusing low level rows.        |
| Events written by the API, in the same transaction | Knows who did it and records one clear event per action. | Changes made straight in the database by hand aren't recorded.                                       |

## Decision

- **One `audit_events` table, written by the API in the same transaction as the change.** If the change is refused, made from an old version, or rolled back, there's no event. There's never a change without its event.
- **Recorded:** adding, changing (each field, before and after) and deleting people, signing up, approving and rejecting accounts, changing access, signing in, failed sign ins, lockouts and signing out. Never a password, a password hash or a session.
- **Snapshots, not links.** Each event keeps the names as they were, and `scope`: the person and everyone above them at that moment. History still reads correctly after someone is renamed, moved or deleted.
- **Append only, twice over.** The API's database user can add and read events but not update, delete or empty the table. A trigger also refuses updates, deletes and truncates from anyone, including the table's owner. Removing that protection needs a migration, which shows up in review.
- **Who sees what:** an admin sees events about people who were below them when it happened, and about themselves. Every admin sees requests for accounts, like the approvals list. Someone at the top sees everything, including failed sign ins for emails that don't belong to anyone. Anyone who can see an event was above that person at the time, so salary changes in the history stay private by the same rule as everywhere else.
- **The Audit page** shows each event as a plain sentence with its changes, newest first, filtered by person and kind of event. Admins open a person's history from their details.

## Consequences

- Changes made directly in the database, by whoever looks after it, aren't in the trail. Those go through migrations or the `task admin:create` command.
- The table only grows. At this size that's fine for years, and archiving old events later is a migration away.
- Someone who was moved away from a manager is still in that manager's old history, because the manager was above them when those things happened. New events go to their new managers.
