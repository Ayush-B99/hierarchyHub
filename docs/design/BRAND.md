# Brand Guide

This guide describes how Hierarchy Hub looks, sounds and moves, so every screen and document feels like the same product. The values here come straight from the code (`apps/web/src/styles/tokens.css`), and the reasons behind the visual direction are in [ADR 0009](../adr/0009-visual-design-system.md). For the component building blocks, see the [design README](README.md).

## 1. The idea

Hierarchy Hub shows people and how they connect. The brand is built around one image: **a person at the centre, with the people around them.** That image appears in the logo, in the Orbit view, and in the moons that circle each person's picture.

The look is calm and tactile: soft sculpted clay under frosted glass, in quiet whites and graphite. It should feel like a well-made object on a desk, not another busy HR dashboard. The people are the only colour on the screen, through their profile pictures.

| We are                           | We are not                      |
| -------------------------------- | ------------------------------- |
| Calm, so data is easy to read    | Flashy or noisy                 |
| Warm and human                   | Corporate or cold               |
| Precise about people's data      | Casual about mistakes           |
| Playful in small, earned moments | Playful at the expense of speed |

## 2. Name

- Always written **Hierarchy Hub**: two words, both capitalised.
- Never shortened to "HH" in anything a user sees.
- In code and package names it is `hierarchy-hub` or `hierarchyHub`.
- Descriptor, when the name needs explaining: _Employee hierarchy management for EPI-USE Africa._

## 3. Logo

The mark is one dark circle above two lighter ones: a manager and their team.

<p>
  <img src="../../apps/web/public/favicon.svg" width="64" height="64" alt="The Hierarchy Hub mark: one dark dot above two lighter dots, on a pale disc" />
</p>

| Part        | Value                                           |
| ----------- | ----------------------------------------------- |
| Disc        | `#F2F2F0`                                       |
| Manager dot | `#1C1C1E`, full strength                        |
| Team dots   | `#1C1C1E` at 45% opacity                        |
| Source file | `apps/web/public/favicon.svg` (32 × 32 viewBox) |

Rules:

- In the top bar, the mark sits on a raised clay disc to the left of the name, set in Manrope ExtraBold. There the dots take the text colour, so they are graphite in light mode and near-white in dark mode.
- The browser tab icon uses the fixed colours in the table above, so it reads on both light and dark browser tabs.
- Keep the three dots in their arrangement. Don't add more dots, recolour them, or rotate the mark.
- Leave at least a quarter of the mark's width clear around it.
- The smallest size is 16 pixels, as a browser tab icon.

## 4. Colour

The palette is deliberately almost colourless. Layered neutrals create depth through light and shadow, so the profile pictures and a single glossy accent stand out. Components only ever use these tokens, never raw colours, so both themes stay in step.

### Light mode: layered whites

| Token         | Hex                   | Used for                                        |
| ------------- | --------------------- | ----------------------------------------------- |
| `--ink`       | `#1C1C1E`             | Main text, headings, icons                      |
| `--muted`     | `#5E5F63`             | Secondary text, labels, hints                   |
| `--surface`   | `#FFFFFF`             | Cards and solid panels                          |
| `--surface-2` | `#F2F2F0`             | Inputs, wells, secondary fills                  |
| `--surface-3` | `#E7E7E5`             | Deeper wells, pressed states                    |
| `--bg-a`      | `#F5F5F3`             | Page background, light end                      |
| `--bg-b`      | `#E4E5E3`             | Page background, dark end                       |
| `--fill`      | `#1C1C1E`             | Primary buttons, selected pills, team-size tags |
| `--on-fill`   | `#FFFFFF`             | Text on `--fill`                                |
| `--danger`    | `#A8322A`             | Errors and destructive actions only             |
| Pearl accent  | `#5A5A5E` → `#0E0E10` | The small glossy ball                           |

### Dark mode: graphite

| Token         | Hex                   | Used for                                        |
| ------------- | --------------------- | ----------------------------------------------- |
| `--ink`       | `#F2F2F0`             | Main text, headings, icons                      |
| `--muted`     | `#A6A7AB`             | Secondary text, labels, hints                   |
| `--surface`   | `#1F2023`             | Cards and solid panels                          |
| `--surface-2` | `#26272B`             | Inputs, wells, secondary fills                  |
| `--surface-3` | `#2F3034`             | Deeper wells, pressed states                    |
| `--bg-a`      | `#121214`             | Page background, dark end                       |
| `--bg-b`      | `#1B1C1F`             | Page background, light end                      |
| `--fill`      | `#F2F2F0`             | Primary buttons, selected pills, team-size tags |
| `--on-fill`   | `#111113`             | Text on `--fill`                                |
| `--danger`    | `#F0948A`             | Errors and destructive actions only             |
| Pearl accent  | `#FFFFFF` → `#8E8F93` | The small glossy ball                           |

### Contrast

Every text colour meets WCAG 2.2 AA (at least 4.5 to 1) on the surfaces it is used on. Measured ratios:

| Pair                       | Light  | Dark   |
| -------------------------- | ------ | ------ |
| Main text on a card        | 17.0:1 | 14.5:1 |
| Secondary text on a card   | 6.4:1  | 6.8:1  |
| Secondary text on an input | 5.7:1  | 6.2:1  |
| Button text on a dark fill | 17.0:1 | 16.8:1 |
| Error text on a card       | 6.7:1  | 7.2:1  |

Colour never carries meaning on its own. Errors also have words, selected pills also change shape, and blocked drop targets also fade.

## 5. Typography

One typeface, **Manrope**, self-hosted as a variable font so it loads fast and never depends on an outside service. Its rounded, geometric shapes match the clay forms. Fallbacks: Helvetica Neue, Arial, sans-serif.

| Style   | Size                | Weight     | Letter spacing | Used for                          |
| ------- | ------------------- | ---------- | -------------- | --------------------------------- |
| Display | 32 to 62 px (fluid) | 800        | −0.04em        | The selected person's name        |
| Title   | 20 px               | 800        | −0.02em        | The centre card in the Orbit view |
| Lead    | 17 px               | 600        | normal         | Roles under the display name      |
| Body    | 14 to 15 px         | 400 to 600 | normal         | Forms, tables, details            |
| Label   | 12 to 13 px         | 700        | normal         | Field labels, tags, hints         |

- Headings are tight and heavy. Body text is relaxed and readable.
- Sentence case everywhere, including buttons and headings. No all-caps labels.
- Numbers in tables line up, and money is written the South African way: `R 98 000`.

## 6. Shape, depth and surfaces

Depth tells you what you can do:

- **Raised** (soft shadow below, light edge above): you can click it. Cards, buttons, pucks.
- **Pressed in** (shadow inside): you can type in it or it's selected. Inputs, wells, the orbit's groove.
- **Frosted glass**: navigation and panels that float over the moving background.
- **Solid clay**: anything that must be easy to read, like tables and forms. Text never sits straight on the moving background.

| Radius token  | Size  | Used for                         |
| ------------- | ----- | -------------------------------- |
| `--radius-sm` | 18 px | Small controls                   |
| `--radius-md` | 28 px | Person cards, inputs             |
| `--radius-lg` | 32 px | Panels                           |
| `--radius-xl` | 38 px | The hero card and large surfaces |
| Pill          | 999px | Buttons, tags and filter pills   |

## 7. Motion

Motion explains what changed or shows how things connect. It is never there just to decorate.

- **The signature moment** is the Orbit: the team slowly circling the selected person, with moons circling each picture. It is the one place the app moves on its own, so it stays slow (one turn about every 35 seconds).
- **Motion answers people.** Cards pop in when you move to someone, dialogs ease open, a flicked orbit glides to a stop.
- **Motion gets out of the way.** The orbit stops the moment your pointer is over a card, while you drag someone, and while you use the keyboard.
- **Reduced motion is respected everywhere.** When someone asks their device for less motion, the background, the orbit and every animation stand still.

## 8. People and pictures

- Profile pictures come from Gravatar and are always round.
- People without a picture get their initials on a soft neutral disc, so nobody looks "missing".
- The selected person's picture has a bold ring, so the centre of attention is always clear.
- We never use stock photos or illustrations of people. The real team is the imagery.

## 9. Voice and tone

We write like a helpful colleague: plain words, short sentences, and always clear about what happened and what to do next.

| Principle                               | Example from the app                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Say exactly what happened               | "Someone else changed Johan while you were editing, so your changes weren't saved."              |
| Then say what to do                     | "Load their latest version, then make your change again."                                        |
| Explain consequences before they happen | "4 people report to Johan. They'll move to Sipho Dlamini."                                       |
| Name actions by what they do            | **Add employee**, **Save changes**, **Delete employee**, **Load the latest version**             |
| Keep the same word through a flow       | The button says **Move**, and the confirmation says "Naledi now reports to Johan van der Merwe". |
| Turn empty states into direction        | "Nobody reports to Ruan yet."                                                                    |
| Use people's names                      | "Move Naledi here" rather than "Drop item here"                                                  |

Don't:

- apologise or blame ("Oops!", "You entered an invalid value")
- use jargon the user doesn't need ("412 Precondition Failed", "foreign key")
- use exclamation marks in errors
- write in all caps

## 10. Accessibility is part of the brand

- Every interactive element works with a keyboard, with a clearly visible focus ring.
- Icon-only buttons always have a text label for screen readers.
- Text meets WCAG 2.2 AA contrast in both themes (section 4).
- Decorations like the moons and the background are hidden from screen readers. Everything they show is also written in words.
- Layouts work from 360 pixel wide phones upward. The Orbit becomes a stacked list on narrow screens.
