# Bouncing balls

This example demonstrates the Canvas 2D API using an HTML canvas element.

## Browser support

The example checks whether `canvas.getContext("2d")` returns a usable
rendering context. When it does, the canvas setup and helper functions
remain available.

When the 2D context is unavailable, the canvas is replaced with an
accessible status message explaining that the browser cannot run the
example.

## Regression test

Run from the repository root:

    npm install
    npx playwright install chromium
    npm run test:r18-t045

The test checks both supported and unsupported Canvas 2D paths.
