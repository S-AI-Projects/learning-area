# R18-T031 Baseline Results

Target page: `javascript/asynchronous/sequencing-animations/start/index.html`
Base revision: `2197326ba859ff3477919087b488157f9d618a6` (`upstream/main`)

## Page Classification
- Page type: Static HTML demonstration / exercise starter page for JavaScript asynchronous animation sequencing.
- Teaching purpose: Teaches sequencing Web Animations API promises using `alice1.animate()`, `alice2.animate()`, `alice3.animate()`.
- Elements inspected:
  - `#alice-container`: Grid container `<div>` hosting three Alice SVG images.
  - `#alice1`, `#alice2`, `#alice3`: `<img>` elements representing visual characters tumbling in sequence.
  - Interactive controls: None (no links, buttons, form inputs, or keyboard-focusable elements).

## Baseline Observations (Parent Revision)
- Rendered page loaded via Playwright Chromium headless.
- Tab key pressed from the initial document state.
- Observed active element: `document.activeElement` remained on `BODY`.
- Skip link: None present (`a` count = 0).
- Keyboard traversal: No page content was keyboard reachable.
- Positive `tabindex` values: None (count = 0).
- Layout:
  - `body`: `display: flex`, `justifyContent: center`, `backgroundColor: rgb(108, 55, 63)`.
  - `#alice-container`: `display: grid`, `placeItems: center`, `width: 90vh`.
- Conclusion: The page is a static demo without any interactive controls. In accordance with task instructions, a skip-to-content link was added to enable keyboard skip navigation without altering demonstrated CSS behavior.
