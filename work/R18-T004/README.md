# R18-T004 Test Evidence

## Example tested
`html/forms/image-type-xy-coords/index.html`

## Baseline
- The page contains one `input` element with `id="image"` and `type="image"`.
- The image loads successfully and has visible layout.
- The original page has no JavaScript initialization or event handlers.

## Test performed
Command:

```bash
node tests/course/r18-t004.mjs
```

Expected result: all assertions pass, with no duplicate generated elements, unexpected updates, active test listener after cleanup, or browser errors.

Actual result: **All tests passed.**

Output:
- PASS: Original image input loads and has visible layout.
- PASS: Repeated initialization creates only one toggle and status element.
- PASS: Two toggles produce exactly two updates and restore the original style.
- PASS: Cleanup removes test elements and disables the event listener.
- PASS: No unexpected browser errors.

## Tool versions
- Node.js: v26.12.1
- npm: 11.20.0
- Playwright: 1.65.1
- Browser: Chromium (Playwright)

## Changes
- Added a Playwright regression test using an isolated harness.
- Added example testing instructions in `html/forms/image-type-xy-coords/README.md`.
- Added Playwright as a development dependency.
- Added `node_modules/` to `.gitignore`.

The original example HTML remains unchanged.