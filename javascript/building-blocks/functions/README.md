# Functions: conflict example

This example demonstrates a JavaScript naming conflict between two classic
scripts. Both scripts declare the same top-level `const name`, so the second
script intentionally produces a `SyntaxError`. The first script's greeting
and native alert remain part of the demonstration.

The page is static and contains no animation. Reduced-motion preferences
therefore do not change its content or layout.

The existing paragraph is keyboard-focusable with `tabindex="0"`. Its
`:focus-visible` outline provides a visible indicator when reached by
keyboard navigation.

## Run the example

From the repository root:

```bash
python3 -m http.server 4178 --directory javascript/building-blocks/functions
```

Open http://127.0.0.1:4178/conflict.html.

## Run the R18-T048 regression

Install dependencies and Chromium if needed:

```bash
npm install
npx playwright install chromium
```

Run the browser regression from the repository root:

```bash
node tests/course/r18-t048.mjs
```

The test also supports `CHROMIUM_PATH` for a locally installed Chromium
executable. It starts its own local server, uses fresh browser contexts,
and saves screenshots and evidence under `work/R18-T048/`.
