# R18-T044 — Deterministic browser test evidence

## Target

`html/introduction-to-html/html-text-formatting/text-start.html`

## Baseline behavior

The original starter page is a static HTML document containing a hummus
recipe as plain text inside the body.

- No JavaScript files or inline scripts.
- No linked stylesheets.
- No images.
- No interactive controls.
- No external API, clock, or random behavior.
- The body has no child HTML elements.
- The browser renders the recipe as plain text.

The companion `text-complete.html` demonstrates the semantic HTML
formatting that learners are expected to add. The starter file was
intentionally left unchanged.

## Deterministic test inputs

- Browser: Playwright Chromium.
- Viewport: 1280 × 800 CSS pixels.
- Device scale factor: 1.
- Locale: en-US.
- Time zone: UTC.
- Reduced motion: enabled.
- Font fixture: monospace, 16px, injected by the test.
- Server: test-managed local HTTP server on 127.0.0.1.
- Network: requests outside the local test server are blocked.
- Browser contexts: two independent fresh contexts.

## Expected results

1. The target page responds with HTTP 200.
2. The page title is `Quick hummus recipe`.
3. The document language is `en-US`.
4. All expected recipe text is present and in the correct order.
5. The original starter page remains plain text.
6. The viewport and font fixture match the fixed values.
7. No external network requests occur.
8. No unexpected JavaScript page errors occur.
9. Both fresh contexts produce identical asserted results.
10. Assertion failures cause a nonzero process exit.

## Actual results

`actual-results.txt` is regenerated automatically after the strengthened
browser test completes successfully. The committed file currently marks the
refresh as pending because the expanded assertions were added after the
previous captured run. Run the command below to create the current
expected-versus-actual evidence.

## Changed behavior

No source HTML behavior was changed. The contribution adds a deterministic
browser regression test and test-only rendering fixtures. The fixture
controls viewport and typography so the assertions do not depend on
browser defaults.

## Run

From the repository root:

```bash
npm install
npx playwright install chromium
node tests/course/r18-t044.mjs
```
