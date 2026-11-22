# Document manipulation examples

This directory contains introductory Document Object Model (DOM) manipulation examples:

- `dom-example.html`: Initial HTML document structure featuring a dinosaur image and a paragraph with a hyperlink before dynamic DOM manipulation is applied.
- `dom-example-manipulated.html`: Complete example with embedded JavaScript demonstrating programmatic creation, styling, and insertion of DOM elements.
- `dinosaur.png`: Local image asset used by the example page.
- `shopping-list.html` & `shopping-list-finished.html`: Interactive shopping list application starter and finished implementation.

## Deterministic browser regression test

This example is verified by an automated Playwright regression test:

```bash
node tests/course/r18-t055.mjs
```

### What the test verifies

1. **Local test server**: Hosts the example and static image asset locally on an ephemeral port.
2. **Deterministic multi-context isolation**: Executes the page across two independent, freshly initialized browser contexts with locked viewport dimensions (1280x800).
3. **DOM structure and source anchors**:
   - `<img>`: Verified local source (`dinosaur.png`), descriptive alternative text, fully loaded natural dimensions (240x210), and rendered bounding layout.
   - `<a>`: Verified target URL (`https://www.mozilla.org/`), anchor text (`Mozilla homepage`), and containing paragraph hierarchy.
   - Verified that the starter page contains zero scripts, stylesheets, or external tracking elements.
4. **Offline independence**: All public network and external requests are blocked; the test operates fully offline without relying on external servers or APIs.
5. **Clean execution**: Zero page errors, uncaught exceptions, console errors, or network request failures.
6. **State consistency**: DOM and layout snapshots from both independent browser contexts are asserted to be deeply identical.
