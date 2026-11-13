# Advanced box effects

## CSS filter example check

From the repository root, run `node tests/course/r18-t025.mjs`. The check starts a local HTTP server for `filters.html` and its bundled image fixture, then runs the gallery in two fresh Playwright Chromium contexts with a fixed 1280 × 900 viewport and Arial font stack. It requires Node.js, Playwright, and its Chromium browser; it makes no external network requests.

To view the example manually, serve the repository root with `python3 -m http.server` and open `/css/styling-boxes/advanced_box_effects/filters.html`.
