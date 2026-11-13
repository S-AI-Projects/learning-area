# Automation example

This example demonstrates generating elements with an arrow function. Its separate
"Safe text rendering" companion displays submitted text literally; it does not
support rich HTML.

Run the browser regression from the repository root with:

```sh
npm install --prefix tests/course
node tests/course/r18-t028.mjs
```

The check starts and stops its own local HTTP server and Chromium browser. It
requires Node.js, Playwright, and Playwright's Chromium browser.
