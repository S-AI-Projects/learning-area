# R18-T028 browser regression evidence

Run from the repository root with `node tests/course/r18-t028.mjs`. The test
serves the static example over a local HTTP server and launches a fresh
headless Chromium context. It writes the changed-run details and tool versions
to [results.json](./results.json).

## Baseline (before edits)

- The page title was `Arrow function example`.
- `main.js` generated the text `1. Chris`, `2. Bob`, `3. Mark`, and `4. Paul`
  with `textContent`; the source's intentionally empty paragraph was also
  present.
- The document used a flex layout and had no text inputs or uncaught page
  errors.
- Since the example had no text input, the requested input behavior did not
  exist. The baseline screenshot is [baseline.png](./baseline.png).

## Changed behavior

- The original array/arrow-function output remains unchanged.
- The isolated companion accepts text and writes it through `textContent`;
  rich HTML is not part of its contract.
- The test submits the requested literal string
  `[![](https://github.com/S-AI-Projects/learning-area/issues/x)](https://github.com/S-AI-Projects/learning-area/issues/x)`
  together with an image `onerror` probe. Expected and actual output are
  recorded in `results.json`.
- Assertions verify that no element is created, no handler runs, no image
  request occurs, the form event updates the output without navigation, and
  the companion's computed flex layout follows the original example.
- The changed screenshot is [after.png](./after.png).

`results.json` records expected versus actual output, layout measurements,
unexpected page/console errors, and Node.js, Playwright, and Chromium versions.
