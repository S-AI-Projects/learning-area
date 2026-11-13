# Bouncing balls

This example demonstrates JavaScript objects drawing and animating bouncing
balls with the Canvas 2D API. The WASD keys move the white circle; touching a
ball removes it.

From the repository root, start a local server with
`python3 -m http.server 8000`, then open
`http://localhost:8000/javascript/oojs/assessment/`. If the browser does not
provide a Canvas 2D context, the canvas is hidden and the page explains that the
API is unsupported.

## Regression test

From the repository root, install the browser-test dependency and Chromium once:

```sh
npm ci --prefix tests/course
tests/course/node_modules/.bin/playwright install chromium
```

Then run:

```sh
node tests/course/r18-t026.mjs
```

The test starts an ephemeral local HTTP server, waits until the example is
available, tests supported and unsupported Canvas environments in separate
browser contexts, and closes the browser and server on completion.
