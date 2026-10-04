# 0014. Build the org chart views and the employee table ourselves

- Status: Accepted
- Date: 2026-10-04
- Replaces: the React Flow and TanStack Table parts of [0002](0002-react-and-nestjs.md)

## Context

ADR 0002 planned React Flow for the org chart and TanStack Table for the employee table. When we built the screens, two things changed our minds:

- A full tree of the whole organisation becomes hard to read quickly. With a few hundred people, you spend more time zooming and panning than finding anyone. People usually want to answer "who does this person report to, and who is in their team?"
- The table sorts, filters and pages on the server, so the database does the heavy lifting. TanStack Table's main strengths (sorting and filtering in the browser) would go unused.

Both libraries also bring their own look, which fights the clay and glass design (ADR 0009).

## Options

| Option                                                       | Pros                                                                                                                          | Cons                                                                             |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| React Flow tree of everyone                                  | Zoom, pan and drag built in. Shows the whole organisation at once.                                                            | Hard to read past a few dozen people. Heavy. Styling it to our design is fiddly. |
| Focused views built by hand (Orbit and Levels)               | Always readable, however big the organisation. Matches the design exactly. No extra libraries. Full control of accessibility. | More of our own code to write and test.                                          |
| TanStack Table                                               | Column logic ready-made.                                                                                                      | Its browser-side sorting and filtering would be unused. Another dependency.      |
| A plain HTML table, with sorting and filtering on the server | Simple, accessible by default, fast with 10,000 people.                                                                       | We write the column headers and sort buttons ourselves.                          |

## Decision

- The org chart is two views of the same data, both focused on one selected person:
  - **Orbit**: the selected person in the middle, their manager above and their team circling them on a rotating 3D ring. It is built from normal HTML cards placed in 3D with CSS transforms, so cards stay clickable, keyboard friendly and readable by screen readers.
  - **Levels**: one column per level, from the top of the organisation down to the selected person.
- A **path to the top** panel and the global search let you reach anyone in one or two steps.
- The employee table is a plain HTML table. Sorting, filtering and paging happen in the database through the API.

## Consequences

- The org chart stays readable for small and large organisations alike, and works on phones (the Orbit stacks into a list on narrow screens).
- Drag and drop, keyboard support and reduced motion support are our own code, so they have their own tests.
- There's no single picture of the whole organisation. The Levels view and the People table cover that need.
- Two fewer dependencies to keep up to date.
