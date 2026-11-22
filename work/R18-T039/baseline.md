# R18-T039 Baseline

## Page
`html/forms/toggle-switch-example/index.html`

## Entry Point & Setup
- **Page entry point**: `http://127.0.0.1:<PORT>/html/forms/toggle-switch-example/index.html`
- **Setup command**: `npm install && node tests/course/r18-t039.mjs`

## Purpose
Demonstrates an accessible toggle switch built using a native HTML checkbox (`<input type="checkbox" name="power" id="power">`) and associated label, styled with CSS transitions to animate the toggle knob smoothly between "Off" and "On" states.

## Structure & Linked Assets
- **External scripts / styles**: None (self-contained HTML and internal CSS).
- **Key CSS styling**:
  - `input[type="checkbox"]`: Custom pill styling (`appearance: none`, `width: 44px`, `height: 24px`, `border: 2px solid black`, `transition: all 0.4s`).
  - `input[type="checkbox"]::before`: Circular switch knob (`width: 16px`, `height: 16px`, `border-radius: 9px`, `transition: all 0.4s`).
  - `input[type="checkbox"]:checked`: `background-color: #ffaa00; transition: all 0.4s;`.
  - `input[type="checkbox"]:checked::before`: `left: 35%; transition: all 0.4s;`.
  - Label opacity toggling for `.on` and `.off`.

## Source Anchor
| Anchor | Element | Role & Purpose |
|---|---|---|
| `#power` | `<input type="checkbox" name="power" id="power">` | The toggle switch checkbox input representing power state. Target for keyboard focus and Space-key toggling. |

## Baseline Observations (Before Fix)
| Property | Value | Evaluation |
|---|---|---|
| `#power` transition duration | `0.4s` | Always animated |
| `@media (prefers-reduced-motion)` query | Not implemented | Fails to respect user reduced-motion preference; animations persist |
| Focus outline | `1px dotted black` | Overlaps the `2px solid black` border without offset, making it poorly visible |
| Keyboard accessibility | Standard Tab & Space support | Functional |

## Changed Behavior (After Fix)
- Added `@media (prefers-reduced-motion: reduce)` to disable transitions (`transition: none;`), resulting in `0s` transition duration under reduced motion.
- Updated focus styling to `outline: 2px solid #005fcc; outline-offset: 2px;` so the focus indicator is distinctly visible against the black border at both mobile (`390px`) and desktop (`1280px`) viewport widths.
