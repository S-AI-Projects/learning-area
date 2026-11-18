# Safe text rendering

`text-rendering.html` is a companion example demonstrating safe display of user-provided text.

The example uses `textContent` instead of `innerHTML`, so HTML-like input is displayed as text and is not interpreted as markup.

## Run

From the repository root, start a local server:

    python3 -m http.server 8000

Open http://localhost:8000/css/web-fonts/text-rendering.html.

## Test

With Playwright and Chromium installed, run from the repository root:

    node tests/course/r18-t008.mjs

The test verifies literal text rendering, absence of injected elements and script execution, visible output layout, and absence of page errors.
