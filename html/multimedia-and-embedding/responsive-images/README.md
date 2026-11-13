# Responsive images example

## Responsive layout regression

The page uses normal vertical scrolling for its text and images; it has no
intentionally horizontally scrollable demonstration. The Playwright check
covers image source selection, content order, viewport bounds, and keyboard
navigation of the image-credit link at 360×800 and 1280×800.

Run from the repository root:

```sh
npm ci --prefix tests
npm exec --prefix tests -- playwright install chromium
node tests/course/r18-t022.mjs
```

The test starts a temporary local HTTP server, waits until the page is
available, then closes the server and browser when it finishes. It writes
viewport screenshots and expected-versus-actual results to `work/R18-T022/`.
To capture the baseline before a future page change, run
`node tests/course/r18-t022.mjs baseline`; the normal command records the
current result as `changed`.
