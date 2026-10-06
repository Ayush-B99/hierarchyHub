# Hierarchy Hub documentation

**Live app:** [d6atm0gw3zjf0.cloudfront.net](https://d6atm0gw3zjf0.cloudfront.net)

Hierarchy Hub is a cloud hosted app for managing EPI-USE Africa's employees and who they report to. This is its documentation, also published as a website at [ayush-b99.github.io/hierarchyHub](https://ayush-b99.github.io/hierarchyHub/).

**Start here**

- **[User guide](user-guide/USER_GUIDE.md):** how to use every feature, with screenshots. A required deliverable.
- **[Technical document](technical/TECHNICAL.md):** the architecture, design patterns, technologies and why. A required deliverable.
- **[Highlights](highlights/HIGHLIGHTS.md):** the strongest and most unique parts, in one page, with a five minute tour.
- **[Beyond the brief](extras/EXTRAS.md):** everything built beyond what was asked, with where to see it.

The [SRS](srs/SRS.md) ends with a checklist showing where every line of the brief is met.

## Every document

| Document                                                | What it covers                                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [Software Requirements Specification (SRS)](srs/SRS.md) | What the system must do and what was built. Requirements, business rules, data, and a checklist against the brief. |
| [Software Architecture Specification (SAS)](sas/SAS.md) | How the system is built. Architecture diagrams, data model, request flows, hosting and design patterns.            |
| [Architecture Decision Records (ADRs)](adr/README.md)   | One short record per major decision, with the options we considered.                                               |
| [Technical document](technical/TECHNICAL.md)            | Short summary of the architecture, patterns, technologies and reasons. This is a required deliverable.             |
| [API contract](api/API.md)                              | The REST endpoints the frontend and backend agree on.                                                              |
| [Deploying](deploy/DEPLOY.md)                           | Setting up the live site on AWS, step by step, and turning it off.                                                 |
| [Security testing](security/ATTACKS.md)                 | Every attack we tried on the app, what broke, and how it's now protected.                                          |
| [User guide](user-guide/USER_GUIDE.md)                  | How to use the app, with screenshots. This is a required deliverable.                                              |
| [Highlights](highlights/HIGHLIGHTS.md)                  | The strongest and most unique parts, in one page                                                                   |
| [Beyond the brief](extras/EXTRAS.md)                    | Everything built beyond the brief, in the app and under the hood, with where to see each item.                     |
| [Roadmap](planning/ROADMAP.md)                          | The order we build things in, and the status of each part.                                                         |
| [Brand guide](design/BRAND.md)                          | Name, logo, colours with measured contrast, typography, motion, and voice and tone.                                |
| [Design](design/README.md)                              | The visual direction, building blocks and design rules, with the clickable concept.                                |

## Diagrams

Diagrams are written in [Mermaid](https://mermaid.js.org/). GitHub and the docs site show them as pictures automatically. In VS Code, install the "Markdown Preview Mermaid Support" extension (it is in the recommended extensions list).

## Keeping docs up to date

- Every requirement has an ID, such as `FR-05`. Use these IDs in issues, pull requests and tests.
- If a change affects how the system behaves, update the SRS in the same pull request.
- If a change affects how the system is built, update the SAS or add a new ADR.
- Documents are versioned with git, so there is no need for a change log inside each file.
- Preview the docs site with `task docs`. Pull requests build it in strict mode, so broken links fail, and merges to `main` publish it (ADR 0015).
