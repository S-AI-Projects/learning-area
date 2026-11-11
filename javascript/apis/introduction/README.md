# Bouncing balls

## Run the example

From the repository root, start a local static HTTP server:

```bash
python3 -m http.server 8000
```

Open <http://localhost:8000/javascript/apis/introduction/bouncing-balls.html\>.

The page loads `style.css` and `main.js`. The script sizes the Canvas 2D drawing
surface to the browser viewport and continuously animates 25 colored balls.
Balls move, bounce at the canvas edges, and change color when they collide.

## Browser regression check

Install the repository's development dependencies with:

```bash
npm install
npx playwright install chromium
```

Run the Task 6 browser check from the repository root:

```bash
node tests/course/r18-t046.mjs
```

The check starts its own temporary local HTTP server and launches a fresh,
headless Chromium context. It verifies the page title and heading, canvas
dimensions, computed layout, the 25-ball drawing loop, and canvas changes
between animation frames. It also fails on uncaught page errors or failed
requests and closes its browser and server processes on completion.

Evidence is written to `work/R18-T046/`.
