# 0009. Clay and glass visual design, with a Three.js background

- Status: Accepted
- Date: 2026-10-02

## Context

Most HR tools look the same. We want Hierarchy Hub to feel distinctive and enjoyable to use, without hurting usability or accessibility. Several concepts were explored; the chosen one is in `docs/design/concept.html`.

## Decision

- Soft, sculpted 3D shapes with frosted glass panels, in layered whites (light mode) and graphite (dark mode).
- A moving background of morphing clay shapes, built with Three.js and custom shaders.
- Plain CSS Modules with design tokens in CSS variables. No CSS framework.
- Small effects in the style of React Bits (spotlight, split text, count up, magnet), added where they help.

## Consequences

- Strong visual identity, consistent across light and dark mode through shared tokens.
- Three.js is loaded on demand in its own file, so it does not slow the first page load.
- WebGL may be unavailable on some devices. The background then falls back to still shapes.
- Motion stops when the user asks for reduced motion.
- Frosted glass needs a solid fallback colour for readability, which the tokens provide.
