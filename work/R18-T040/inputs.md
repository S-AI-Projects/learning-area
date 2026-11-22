# R18-T040 Inputs

## Target Page
`accessibility/multimedia/custom-controls-OOJS/index.html`

## Source Anchors
`audio`, `a`, `video`

## Fixture Mutations Tested
1. **Event Binding Mutation (JavaScript):**
   - Target: `accessibility/multimedia/custom-controls-OOJS/main.js`
   - Interception: Playwright `page.route('**/main.js', ...)`
   - Mutation: Severed `this.playPauseBtn.onclick` event handler.
   - Purpose: Verifies that regression checks detect broken click handlers by asserting that button text fails to transition to `'Pause'`.
2. **Style Rule Mutation (CSS):**
   - Target: `accessibility/multimedia/custom-controls.css`
   - Interception: Playwright `page.route('**/custom-controls.css', ...)`
   - Mutation: Replaced `.controls { height: 36px; }` with `.controls { height: 0px; display: none; }`.
   - Purpose: Verifies that regression checks detect broken layout styles by asserting that custom controls fail the visibility check.

## Test Environment & Configuration
| Parameter | Value |
|---|---|
| Test runner | Node.js Playwright (`tests/course/r18-t040.mjs`) |
| Local server | Node.js HTTP server (`http://127.0.0.1:<PORT>`) |
| Browser | Chromium (headless) with `--autoplay-policy=no-user-gesture-required` |
| Viewport | 1280 × 800 |
| Network mode | Local static server only |
