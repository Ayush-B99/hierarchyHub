# Beyond the Brief

The brief invites extra functionality, and asks that it be documented so it can be credited. This page lists everything Hierarchy Hub does beyond what the brief asks for, in one place, with where to see each item for yourself.

The brief's own requirements, and where each is met, are in the [SRS checklist](../srs/SRS.md#8-checklist-against-the-brief).

**Quick tour (two minutes):**

1. Open the Explore page and watch the team circle the selected person. Drag the empty space to spin it.
2. Drag someone onto another person to change their manager.
3. Press **/** and type part of a name.
4. On the People page, change a pill in the filter sentence, then select **Export CSV**.
5. Open the same person in two tabs, edit them in both, and save both. The second save is stopped.
6. Switch to dark mode with the round button in the top bar.

## 1. In the app

| Extra                                 | What it does                                                                                                                                                             | Try it                                               |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| **Rotating 3D Orbit view**            | The selected person sits at the centre with their team circling them on a tilted ring. Cards grow and brighten at the front and pass behind the centre card at the back. | Explore page                                         |
| Spin the orbit yourself               | Drag the empty space to spin it, or flick it to watch it glide. Swipe sideways on touch screens.                                                                         | Explore page                                         |
| Moons for team size                   | Small moons circle each team member's picture, one for each person in their own team.                                                                                    | Explore page, any card with a team                   |
| An orbit that stays out of the way    | It stops while you point at a card, drag someone or use the keyboard. Tabbing to someone turns them to the front.                                                        | Explore page                                         |
| **Levels view**                       | One column per level of the organisation, from the top down to the selected person.                                                                                      | **Levels** button on the Explore page                |
| Path to the top                       | Everyone between the selected person and the top, one click away.                                                                                                        | Left panel on the Explore page                       |
| Works alongside                       | Colleagues who share the same manager.                                                                                                                                   | Details panel                                        |
| Team numbers                          | Direct reports, everyone in their whole team, and how many levels below the top they are.                                                                                | Details panel                                        |
| **Drag and drop to change a manager** | Drag a person onto their new manager. Allowed targets are outlined, blocked ones fade, and you confirm before anything changes.                                          | Orbit view, with a mouse                             |
| **Search from anywhere**              | Find anyone by name, email, employee number or role, from every page, with matching letters underlined.                                                                  | **Find someone**, or press **/** or **Ctrl/Cmd + K** |
| Filters written as a sentence         | "Show people in any role, earning any salary, born in any year and reporting to anyone", where each pill in the sentence is a filter.                                    | People page                                          |
| **CSV export**                        | Downloads everyone who matches the current filters, not just the visible page.                                                                                           | **Export CSV** on the People page                    |
| **Shareable links**                   | The selected person, view, filters, sort and page all live in the address bar. The back button, bookmarks and shared links just work.                                    | Copy the address on any page                         |
| **Protection against overwriting**    | If two people edit the same employee at once, the second save is stopped, nothing is lost, and they can load the latest version with one click.                          | Edit the same person in two tabs                     |
| Explained consequences                | Before deleting a manager, you're told exactly who will move and to whom.                                                                                                | **Delete** on someone with a team                    |
| Light and dark mode                   | A full graphite theme, remembered between visits.                                                                                                                        | Round button in the top bar                          |
| Phones and tablets                    | Everything works from 360 pixels wide. The Orbit becomes a stacked list on narrow screens.                                                                               | Any phone                                            |
| Distinctive design                    | A sculpted clay and frosted glass look with a moving 3D background, built from one set of design tokens ([brand guide](../design/BRAND.md)).                             | Everywhere                                           |
| Polished details                      | Loading skeletons instead of spinners, confirmation messages after every change, page titles that follow the selected person, and a friendly page for broken links.      | Everywhere                                           |

## 2. Accessibility

| Extra                         | What it does                                                                                                              |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Full keyboard use             | Every feature works without a mouse, with a visible focus ring, a "Skip to content" link and keyboard shortcuts.          |
| Screen reader support         | Labelled controls, announced errors, and decorations such as the moons hidden from screen readers.                        |
| Measured contrast             | Every text colour passes WCAG 2.2 AA in both themes, the lowest at 5.2 to 1 ([brand guide](../design/BRAND.md#contrast)). |
| Reduced motion                | When a device asks for less motion, the orbit, background and every animation stand still.                                |
| Automated accessibility tests | axe checks every main screen on every pull request.                                                                       |

## 3. Data you can trust

| Extra                          | What it does                                                                                                                               | More detail                                                                              |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| **Rules enforced three times** | Self-management, reporting loops, negative salaries and future birth dates are blocked in the form, in the API and in the database itself. | [Technical document, section 5](../technical/TECHNICAL.md#5-how-the-rules-are-protected) |
| Loop-proof under pressure      | A database trigger with a lock means two simultaneous manager changes can't combine into a reporting loop.                                 | [ADR 0010](../adr/0010-database-design.md)                                               |
| Nobody left without a manager  | Deleting a manager moves their team up to the next manager in one transaction.                                                             | [SAS 7.2](../sas/SAS.md#72-delete-an-employee-who-manages-people)                        |
| Version checks                 | Every employee has a version number, and every change must prove it was made from the latest version (ETag and If-Match).                  | [API contract](../api/API.md)                                                            |
| Efficient caching              | Unchanged data is answered with "304 Not Modified" and no body, while still never showing stale data.                                      | [ADR 0011](../adr/0011-caching.md)                                                       |
| Sample data that can't escape  | Sample people can only be loaded into a database on a developer's own machine. The production build contains no mock code at all.          | [Technical document, section 5](../technical/TECHNICAL.md#no-mocked-data)                |

## 4. Security and privacy

The brief doesn't mention security, but the app holds salaries and birth dates on a public URL.

| Extra                    | What it does                                                                                                                       |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| Least privilege database | The API's database user can only read and write rows. A separate user changes the tables.                                          |
| Hardened API             | Security headers, calls only accepted from the web app, a 16 KB request limit, and strict input checks that reject unknown fields. |
| Rate limits              | Per visitor, with a lower limit for changes. Health checks are never limited, so AWS can always see the API.                       |
| Private by design        | Emails are hashed before reaching Gravatar. Logs never contain salaries, birth dates, searches or request bodies.                  |
| Traceable                | Every response carries a request ID that also appears in the logs.                                                                 |

More detail in [ADR 0013](../adr/0013-api-security-layer.md).

## 5. Quality and testing

| Extra                         | What it does                                                                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 290 automated tests           | Web, shared, API unit, database integration and API end-to-end suites ([technical document, section 7](../technical/TECHNICAL.md#7-testing)). |
| Tests against real PostgreSQL | Integration and end-to-end tests run against a real database, in CI as well as locally.                                                       |
| Contract tests                | The same examples run against the mock API and the real API, so the two can never drift apart.                                                |
| Performance tests             | 10,000 extra employees are loaded, and the table and org chart must answer within half a second and one second.                               |
| Concurrency tests             | Two saves are fired at the same moment, and exactly one must win.                                                                             |
| Safe test runs                | End-to-end tests refuse to run against any database whose name doesn't end in `_test`.                                                        |
| CI on every pull request      | Formatting, lint, type checks, every test suite and the build, with nothing merged unless all pass. Dependabot keeps dependencies current.    |

## 6. Engineering and documentation

| Extra                            | What it does                                                                                                                                                                                       |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| One shared source of rules       | Types and validation live in one package used by both the web app and the API.                                                                                                                     |
| Same setup everywhere            | Local Docker, CI and AWS build the database from the same scripts.                                                                                                                                 |
| One-word commands                | `task setup`, `task dev` and `task check` cover the whole workflow.                                                                                                                                |
| 14 architecture decision records | Every major choice, the options considered and why ([ADRs](../adr/README.md)).                                                                                                                     |
| Full specification set           | Requirements with use case diagrams ([SRS](../srs/SRS.md)), architecture and deployment diagrams ([SAS](../sas/SAS.md)), an [API contract](../api/API.md) and a [brand guide](../design/BRAND.md). |
| Built in reviewed parts          | Each part was a branch and pull request of small commits ([roadmap](../planning/ROADMAP.md)).                                                                                                      |

## Optional extras we chose not to build

To be clear about scope, these optional ideas were considered and left out:

| Idea                                    | Why not                                                                                                                        |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Picture upload (FR-16)                  | Gravatar already lets each employee manage their own picture, and storing uploads would add file storage and privacy concerns. |
| Login and roles (FR-17)                 | Not required by the brief. The API protects itself with rate limits and strict checks instead.                                 |
| Change history (FR-18)                  | Version numbers already prevent lost changes. A full audit trail would be the natural next step.                               |
| Dashboard and CSV import (FR-19, FR-20) | Not needed to meet the brief. The table and CSV export cover reporting.                                                        |
