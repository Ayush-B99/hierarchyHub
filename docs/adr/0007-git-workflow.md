# 0007. Use trunk-based development

- Status: Accepted
- Date: 2026-10-02

## Context

We want a clean, easy to follow history, and we want `main` to always work.

## Options

| Option                                                                      | Pros                                                            | Cons                                                        |
| --------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------- |
| GitFlow (`main`, `develop`, long-lived feature branches)                    | Clear stages for big teams with release cycles.                 | Extra branches to keep in sync. Too heavy for this project. |
| Trunk-based development (short branches off `main`, merged by pull request) | Simple. `main` is always up to date. Used by most modern teams. | Needs CI on every pull request, which we have.              |

## Decision

- Create a short-lived branch from `main` for each piece of work, for example `docs/initial-documentation`.
- Merge back through a pull request once CI passes. Use "Rebase and merge" so each small commit stays in the history.
- Write short, clear commit messages that say what changed. There is no enforced format.

## Consequences

- `main` is always in a working state.
- The history reads as a list of small, clear steps.
- Commit messages are not checked automatically, so keeping them clear is up to us.
