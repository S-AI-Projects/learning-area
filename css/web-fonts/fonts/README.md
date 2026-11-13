# Web font specimens

The Zantroke specimen is a static HTML example. Preview it from the repository root with:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8000/css/web-fonts/fonts/zantroke-demo.html`. The page uses its local `specimen_tabs.js` file to switch between the specimen, sample layout, glyph, and installation panels.

## Lifecycle regression check

With Node.js 20 or newer, install the test dependency and Chromium once with `npm ci` and `npx playwright install chromium`. Run `node tests/course/r18-t024.mjs` from the repository root. The check starts a local HTTP server on an available port, waits until the page responds, tests in a fresh Chromium context, then closes the browser and server. It reruns the tab initialization and repeatedly switches panels to check that updates, listeners, timers, and DOM nodes are not duplicated. Inputs, baseline observations, results, and tool versions are written to `work/R18-T024/`.
