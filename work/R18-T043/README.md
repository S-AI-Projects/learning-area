# R18-T043 — Repeat initialization evidence

## Target and input

- Page: `javascript/building-blocks/functions/conflict.html`
- Scripts inspected: `first.js` and `second.js`
- Primary rendered region: the paragraph containing `My body`
- Test command required by the task: `node tests/course/r18-t043.mjs`

## Baseline observed in the original example

The page displays `My body`. `first.js` declares `const name = 'Chris'` and defines `greeting()`. `second.js` also declares a top-level `const name`, so the browser reports the expected `SyntaxError: Identifier 'name' has already been declared`. The first script's `greeting()` remains callable and displays `Hello Chris: welcome to our company.`.

The original page contains no buttons, style/demo toggles, timers, or event listeners. No source HTML or JavaScript was changed to manufacture those features.

## Regression scenarios

1. Load the real page twice in the same Playwright page and fresh browser context; assert the rendered text, greeting function, one expected alert, and one expected duplicate-declaration page error on each load.
2. Insert `first.js` again in the same document; assert the expected additional conflict, no additional script element left behind, and unchanged original body content.
3. Attach an isolated, test-owned toggle harness to the main rendered paragraph; initialize it twice; assert exactly one button, one generated panel, one active click listener, and one active interval.
4. Click the toggle twice; assert exactly two event effects, two style toggles, and restoration of the original style. Assert the computed display and non-zero content layout.
5. Clean up the harness; assert zero active harness listeners, zero active harness intervals, and no generated button/panel. Dispatch a click on the detached button and wait after cleanup to prove that no further event effect or timer tick occurs.
6. Assert there are no unexpected console errors or page errors beyond the known duplicate lexical declaration errors.

## Expected versus actual

The original baseline observations were manually reproduced in Chrome before implementation.

The final regression test passed locally using both commands:

- `node tests/course/r18-t043.mjs` — 1 test passed, 0 failed.
- `npm test` — 1 test passed, 0 failed.

Verified scenarios:

- Two baseline page loads passed.
- Same-document script reinsertion passed.
- Repeated initialization left exactly one test-owned button, panel, click listener, and interval.
- Two clicks produced exactly two effects; the computed background changed on the first click and returned to its original value on the second.
- Cleanup removed the generated elements and test-owned listener and timer; subsequent interaction did not trigger another effect or timer tick.
- No unexpected page or console errors were reported.

`git diff --check` also completed without reporting whitespace errors.

## Environment record

The earlier local environment reported:

- Node.js: `v26.8.1`
- npm: `11.19.0`
- Playwright: `1.65.0`
- macOS: `27.2`
- Browser: Playwright Chromium

Reconfirm the current versions when running the expanded test:

```bash
node --version
npm --version
node -p "require('playwright/package.json').version"
```

## Scope and limitations

The isolated harness verifies the requested DOM lifecycle properties for test-owned behavior because the source example itself has no native toggle, event listener, timer, or generated panel. It does not claim that the original MDN example contains or needs those resources. Original `conflict.html`, `first.js`, and `second.js` remain unchanged.
