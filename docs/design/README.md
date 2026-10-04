# Design

The agreed visual direction for Hierarchy Hub. The [brand guide](BRAND.md) covers the logo, colours, typography, motion and voice and tone in detail. Open [concept.html](concept.html) in any browser to see the clickable concept that the frontend is built from.

## Look and feel

The style is based on soft, sculpted 3D shapes with frosted glass panels on top.

- **Light mode:** layered whites, pearl and soft silver, with graphite text.
- **Dark mode:** graphite, charcoal and near-black, with soft white highlights.
- **Accent:** one small glossy ball (black in light mode, pearl white in dark mode).
- **Font:** Manrope, self-hosted.

## Building blocks

| Piece                 | Where it is used                              | Component               |
| --------------------- | --------------------------------------------- | ----------------------- |
| Moving 3D clay shapes | Behind every page                             | `ClayBackground`        |
| Frosted glass panel   | Navigation, side panels, filters, dialogs     | `Panel variant="glass"` |
| Solid clay panel      | Tables and anything that must be easy to read | `Panel variant="solid"` |
| Sculpted waves        | Hero card and panel headers                   | `Waves`                 |
| Pill button           | Text buttons                                  | `Button`                |
| Puck                  | Round icon buttons and toggles                | `Puck`                  |
| Avatar                | Gravatar picture with an initials fallback    | `Avatar`                |

## Rules

- Components only use the colour tokens in `apps/web/src/styles/tokens.css`. Never hardcode a colour.
- Text always sits on a solid or frosted surface, never straight on the moving background.
- Raised things can be clicked. Pressed-in things are inputs or selected states.
- Every animation stops when the user turns on "reduce motion" in their system settings.
- Icon-only buttons always have an `aria-label`.
