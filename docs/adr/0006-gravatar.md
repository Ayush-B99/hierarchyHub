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

Store the email address with each employee. The browser trims it, makes it lower case, hashes it with SHA-256 and loads `https://gravatar.com/avatar/{hash}?s={size}&d=identicon`.

## Consequences

- No storage or server work for pictures.
- The plain email address is never sent to Gravatar.
- People with no Gravatar get a unique generated picture (`d=identicon`).
- If picture upload is added later (FR-16), an uploaded picture will take priority over Gravatar.
