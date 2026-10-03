# 0006. Build Gravatar links in the browser

- Status: Accepted
- Date: 2026-10-02

## Context

The brief requires Gravatar profile pictures. Gravatar finds a picture using a hash of the person's email address. It supports SHA-256 hashes.

## Options

| Option                               | Pros                                                  | Cons                                                           |
| ------------------------------------ | ----------------------------------------------------- | -------------------------------------------------------------- |
| API builds the link and returns it   | Hashing in one place.                                 | Extra data in every response for something the browser can do. |
| API downloads and stores the picture | Works if Gravatar is down.                            | Storage, cost and stale pictures.                              |
| Browser builds the link              | No server work. Pictures come straight from Gravatar. | Needs the Web Crypto API (all modern browsers have it).        |

## Decision

Store the email address with each employee. The browser trims it, makes it lower case, hashes it with SHA-256 and loads `https://gravatar.com/avatar/{hash}?s={size}&d=blank`.

The picture sits on top of a disc with the person's initials. When someone has no Gravatar, `d=blank` returns a transparent image, so their initials show through.

## Consequences

- No storage or server work for pictures.
- The plain email address is never sent to Gravatar.
- People with no Gravatar see their initials on a soft coloured disc, which matches the design system better than Gravatar's generated patterns (`d=identicon`).
- We don't use `d=404` for this. It works, but the browser logs every missing picture as a red error in the console, which looks like a fault to anyone inspecting the app.
- If Gravatar can't be reached at all, the image fails to load and the initials still show.
- If picture upload is added later (FR-16), an uploaded picture will take priority over Gravatar.
