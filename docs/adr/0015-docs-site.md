# 0015. Publish the docs as a website with MkDocs on GitHub Pages

- Status: Accepted
- Date: 2026-10-04

## Context

The documentation is a set of markdown files that read well on GitHub, but GitHub isn't a comfortable place to read 20 linked documents with diagrams. There is no search, no navigation between documents, and no dark mode.

## Options

| Option                                          | Pros                                                                                        | Cons                                            |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------- | ----------------------------------------------- |
| Leave the docs on GitHub only                   | Nothing to set up.                                                                          | No search or navigation.                        |
| MkDocs with the Material theme, on GitHub Pages | Uses the existing markdown as it is. Search, navigation, dark mode, Mermaid diagrams. Free. | One more build to keep green.                   |
| Docusaurus or another React-based site          | Very flexible.                                                                              | Needs its own app, config and markdown changes. |

## Decision

- The docs are published with **MkDocs Material** to GitHub Pages at https://ayush-b99.github.io/hierarchyHub/, built straight from the `docs/` folder.
- The site uses the app's own logo and palette (the [brand guide](../design/BRAND.md)).
- A small build hook rewrites links that leave `docs/` (to code, the README or CONTRIBUTING) so they point at the same file on GitHub.
- MkDocs and its theme are pinned in `docs-site/requirements.txt`, so every build looks the same.

## Consequences

- The same markdown files work on GitHub and on the site, so there's only one copy of every document.
- Every pull request builds the site in strict mode, so a broken link or missing page fails the Docs check. Merges to `main` publish it.
- Previewing the site needs Python (`task docs`). Editing the docs doesn't.
