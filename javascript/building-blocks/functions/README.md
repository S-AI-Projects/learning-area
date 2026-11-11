# JavaScript functions: conflict example

`conflict.html` loads two classic JavaScript scripts that both declare a global lexical variable named `name`.

The duplicate declaration in `second.js` produces an expected `SyntaxError`. The greeting function from `first.js` remains available and displays its greeting through the inline script.

## Regression test

From the repository root, install the test dependency and Chromium, then run the required browser check:

```bash
npm install
npx playwright install chromium
node tests/course/r18-t043.mjs
```

The test verifies the real example's baseline behavior and repeated script execution. Because the example has no native controls or lifecycle-managed resources, repeated style toggles, a test-owned event listener, interval, and generated DOM nodes are exercised in an isolated Playwright harness attached to the main rendered paragraph. The harness is explicitly test-only and does not change the MDN example's teaching content.
