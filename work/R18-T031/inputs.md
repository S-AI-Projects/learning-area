# R18-T031 Test Inputs

## Target
`javascript/asynchronous/sequencing-animations/start/index.html`

## Server
Ephemeral local static HTTP server bound to loopback `127.0.0.1:0`.
Serves HTML, CSS, JavaScript, and SVG assets with strict repository path bounds checking.

## Browser
- Engine: Chromium (Playwright headless)
- Version: 159.0.8154.6
- Viewport: 1280x720
- Context: Fresh isolated browser context per test execution.

## Keyboard Inputs
1. `Tab`: Pressed from the initial document state to traverse into the page.
2. `Enter`: Pressed while the skip link has keyboard focus to activate navigation.

## DOM Elements Inspected
- `a.skip-link`: Skip navigation link targeting `#alice-container`.
- `div#alice-container`: Main demonstration container, configured with `tabindex="-1"` for accessible focus receipt.
- `img#alice1`, `img#alice2`, `img#alice3`: Original teaching images rendered inside `#alice-container`.

## Captured Screenshots
- `work/R18-T031/baseline.png`: Initial page before modification after Tab.
- `work/R18-T031/changed-focused.png`: Modified page with skip link visibly focused after Tab.
