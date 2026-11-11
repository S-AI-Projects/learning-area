# HTML text formatting example

This directory contains:

- `text-start.html` — the unformatted hummus recipe starter exercise.
- `text-complete.html` — an example of the intended semantic HTML formatting.

## Deterministic browser regression test

From the repository root, install the development dependencies and Chromium:

```bash
npm install
npx playwright install chromium
```

Run the regression test:

```bash
node tests/course/r18-t044.mjs
```

The test starts its own local server and checks the original starter page in
two independent fresh browser contexts. It compares the complete rendered
recipe text with the pinned baseline, verifies that the source has no linked
stylesheets, scripts, images, or interactive elements, and checks computed
layout using a fixed viewport and local CSS typography fixture. The page has
no images or external font assets, so no image fixture or public API is
needed. External requests are blocked, and page and console errors fail the
test.

The test prints the expected baseline text and the actual DOM/layout snapshot
so the run can be compared and recorded in `work/R18-T044/actual-results.txt`.
