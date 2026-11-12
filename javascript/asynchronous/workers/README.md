# Web Workers example

This directory contains the starting and finished versions of the
prime-number Web Worker example.

## Starting example: text-input regression check

The starting page includes a `#user-input` textarea. Its linked
`main.js` and `generate.js` files are intentionally empty in the
starter version.

The page does not insert textarea contents into the output container
as HTML. The R18-T047 regression test records this baseline and
verifies that HTML-looking input remains literal textarea text,
creates no injected element, and executes no event handler.

## Run the regression test

From the repository root:

```sh
npm install
npx playwright install chromium
node tests/course/r18-t047.mjs
```

The test starts a local Python HTTP server on an available port and
cleans up the server and browser when it finishes.

If Chromium is installed at a custom location, set `CHROMIUM_PATH`
to its executable path before running the test.
