# Arrow function example

This static example uses an arrow function to turn an array of names into the numbered results. If the flow diagram cannot be loaded, the page displays a readable status message and keeps the results available.

From the repository root, install the browser-check dependency and Chromium, then run the regression:

```sh
npm ci --prefix tests/course
npx --prefix tests/course playwright install chromium
node tests/course/r18-t023.mjs
```

The regression starts and waits for its local HTTP server. It first returns a 404 for the diagram, checks the visible fallback and rendered layout, then restores the SVG fixture and verifies that the image loads and the fallback clears. Results and tool versions are written to `work/R18-T023/`.
