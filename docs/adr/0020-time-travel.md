# 0020. Time travel through the organisation

- Status: Accepted
- Date: 2026-10-08

## Context

The audit trail (ADR 0018) already records every change to the organisation with what it was before and after. That makes it possible to answer a question an org chart usually can't: what did the organisation look like on a given day?

## Options

| Option                                      | Pros                                            | Cons                                                                    |
| ------------------------------------------- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| Store a full snapshot of the org every day  | Simple to read back.                            | A new job to run, lots of repeated data, and nothing between snapshots. |
| Replay the audit trail backwards from today | Uses data we already keep. Exact to the change. | Only goes back as far as the audit trail does.                          |

## Decision

- `GET /api/history` returns every structural change (people added, changed and deleted), newest first. It's open to everyone signed in, because it only contains what everyone can already see today: names, emails, employee numbers, roles and managers. Salaries, birth dates and who made each change are never included.
- `orgAt(today, changes, moment)` in the shared package rebuilds the organisation by **undoing** changes newest first until it reaches the moment: an addition is removed, a change puts back its old values, and a deletion brings the person back along with the team that moved up when they left.
- Deletion events now store a full snapshot of the person and the ids of their team, so they can be brought back exactly.
- The Explore page has a slider, a **Play history** button and **Back to today**. The chosen moment is kept in the address (`?at=`), so a past view can be shared. In the past, editing, dragging and the pay check are switched off.
- Local sample data includes six weeks of seeded history, so there's something to explore. It's added once and is never part of a real deployment.

## Consequences

- History starts when the audit trail started. Anything earlier is not available.
- A test rebuilds the organisation from before a move, an addition and a deletion, and checks it matches exactly what it was.
- Salaries aren't kept in the history view, so the past shows structure only.
