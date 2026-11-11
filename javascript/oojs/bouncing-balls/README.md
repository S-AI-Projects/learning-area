# Bouncing balls

This page is an early stage of the bouncing-balls example. The canvas is
the drawing surface intended for the balls. At this stage, the script
initializes the Canvas 2D context, sets viewport dimensions, and defines
random-number and random-color helpers. It does not yet animate balls.

## Browser support

The script checks whether `canvas.getContext("2d")` returns a usable
Canvas 2D context.

When supported, the original canvas setup and helper functions remain
available.

When the 2D context is unavailable, the canvas is replaced with an
accessible status message explaining that the browser cannot run the
example. This is a JavaScript API fallback; the stylesheet does not use
a CSS feature that requires an `@supports` fallback.

## Regression test

From the repository root, install dependencies and Chromium:

    npm install
    npx playwright install chromium

Run the regression test:

    npm run test:r18-t045

The test starts its own local HTTP server on 127.0.0.1:4175, waits for the
page to become ready, and tests supported and simulated unsupported
Canvas 2D contexts in separate browser contexts. It closes the browser
and server during cleanup.

The original page has no interactive controls or event handlers, so
event-effect assertions are not applicable.
