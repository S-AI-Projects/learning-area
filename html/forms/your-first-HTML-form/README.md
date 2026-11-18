
# Your first HTML form

This example demonstrates a basic HTML form with name, email, and message fields.

## Run the example

Open `first-form.html` in a browser.

## Run the regression test

From the repository root, run:

```bash
node tests/course/r18-t005.mjs
```

The test uses a local HTTP server and two fresh Playwright browser contexts. It checks the form controls, native email validation, consistent layout, and local form submission. It does not depend on a public API.
