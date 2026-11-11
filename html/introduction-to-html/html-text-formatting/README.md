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

The test starts its own local server, uses a fixed viewport and local
typography fixture, and checks the starter page in two fresh browser
contexts. It does not require a public API or external assets.
