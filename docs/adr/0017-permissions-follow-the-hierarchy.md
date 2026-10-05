# 0017. Permissions follow the hierarchy

- Status: Accepted
- Date: 2026-10-06

## Context

Once everyone signs in (ADR 0016), the API knows who is asking. Assessors will try to break the rules from every position: a junior making their boss report to them, a manager giving themselves a raise, an admin changing someone more senior, or someone working out a colleague's salary from the filters.

A single admin flag isn't enough. A CEO and a team lead might both be admins, but the team lead shouldn't be able to change the CEO.

## Options

| Option                                                 | Pros                                                                                                                    | Cons                                                                               |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Roles only: admins change anyone, others change no one | Simple.                                                                                                                 | Any admin can change anyone, including people senior to them.                      |
| Fixed role levels (owner, admin, manager, viewer)      | Familiar.                                                                                                               | Levels have to be kept in step with the org chart by hand, and drift from it.      |
| Reach based on the hierarchy, plus an admin flag       | Matches how the organisation actually works. Nothing to keep in step: moving someone changes their reach automatically. | Every check needs to know who sits below whom, so it has to be fast and race-free. |

## Decision

Your **reach** is everyone below you in the organisation, at any depth.

| Who                | Can see salary and birth date of | Can change                                                                                                               |
| ------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Everyone           | Themselves                       | Their own name and email only                                                                                            |
| Anyone with a team | Themselves and their reach       | Anything about people in their reach, and move them to themselves or someone in their reach                              |
| Admins             | The same                         | Also add people into their reach, delete people in their reach, and make accounts in their reach admins or turn them off |
| Someone at the top | Everyone                         | Everyone, and can put people at the top level                                                                            |

- **Nobody can change anyone above or beside them, or anything about themselves beyond their name and email.** So nobody can give themselves a raise, promote themselves, change their own manager, or change their own access. The person at the top keeps their access, because nobody is above them.
- **The rules live in one place**, `packages/shared/src/permissions`, used by the API, the mock API and the screens. Buttons you can't use aren't shown, and the Reports to list only offers managers you're allowed to choose.
- **The API checks again against the database**, inside a transaction that holds the same lock the database trigger takes for manager changes. While a change is being checked, nobody can move anyone, so a person can't be moved out of your reach between the check and the save.
- **Salaries and birth dates are hidden by the API**, not just on screen: they come back as `null`. Filtering or sorting by salary or birth date only looks at people you're allowed to see, so the filters can't be used to guess anyone else's. Responses are marked `Cache-Control: private` and `Vary: Cookie`, so shared caches never mix up two people's views.

## Consequences

- A manager who isn't an admin can still run their team day to day. Adding and removing people stays with admins.
- Changes take a short lock, so two changes are never checked at exactly the same moment. At this size that costs nothing noticeable, and it rules out a whole class of race conditions.
- The person at the top can't be deleted or edited by anyone except for their own name and email. Changing who runs the company is done directly in the database by whoever looks after it.
- Every rule is tested from every position in the sample organisation (`apps/api/test/permissions.e2e-spec.ts`).
