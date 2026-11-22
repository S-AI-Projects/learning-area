# R18-T038 Baseline

## Page
`javascript/oojs/assessment/index.html`

## Entry Point & Setup
- **Page entry point**: `http://127.0.0.1:<PORT>/javascript/oojs/assessment/index.html`
- **Companion entry point**: `http://127.0.0.1:<PORT>/javascript/oojs/assessment/text-rendering.html`
- **Setup command**: `npm install && node tests/course/r18-t038.mjs`

## Purpose
The target assessment page demonstrates Object-Oriented JavaScript (inheritance, classes, collision detection) using the HTML5 `<canvas>` API with bouncing balls and an "EvilCircle" controlled by the user. It also dynamically updates the ball count on screen.
The companion page demonstrates safe user/fixture text rendering without risking HTML injection or unintended script execution.

## Structure & Linked Assets
- **External scripts / styles**:
  - `style.css`: Styles `html`, `body`, `h1`, `p`, and prevents overflow (`overflow: hidden`).
  - `main.js`: Contains OOP class hierarchy (`Shape` -> `Ball`, `EvilCircle`), animation loop, and dynamic ball count updates (`para.textContent = 'Ball count: ' + count;`).
- **Target Page Elements**:
  - `<h1>bouncing balls</h1>`
  - `<p>Ball count: </p>`
  - `<canvas></canvas>` (Source anchor)

## Source Anchor
| Anchor | Element | Role & Purpose |
|---|---|---|
| `canvas` | `<canvas></canvas>` | The primary drawing surface where bouncing balls and player evil circle are animated via 2D rendering context. Sized dynamically to `window.innerWidth` and `window.innerHeight`. |

## Baseline Observations
| Property | Expected / Specified | Actual Value | Status |
|---|---|---|---|
| Canvas count | 1 | 1 | Matched |
| Canvas visible | `true` | `true` | Matched |
| Canvas dimensions | Viewport width × height (1280 × 800) | 1280 × 800 | Matched |
| Initial ball count text | Starts with "Ball count: 25" | "Ball count: 25" | Matched |
| Text insertion method in main.js | `textContent` property | `para.textContent = ...` | Matched |
| User text input control in index.html | None present | None | Matched |
| Dynamic fixture insertion | Safe literal text via `textContent` | Injected markup remains literal text | Matched |
| Page errors | 0 | 0 | Matched |

## Assessment
Baseline behavior in `index.html` is **already correct** — it uses `textContent` for dynamic score updates and does not parse inputs as HTML. Because `index.html` has no text input control, in accordance with Step 4 a small isolated companion example (`javascript/oojs/assessment/text-rendering.html`) was added to demonstrate safe text rendering for arbitrary user/fixture input strings containing markup payloads.
