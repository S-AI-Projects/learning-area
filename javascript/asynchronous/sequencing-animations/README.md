# Sequencing animations

The `start` example displays three static Alice images in a diagonal grid. Its JavaScript defines animation settings but does not start animations.

The example supports keyboard focus on the Alice container and each image. Focus is indicated by a visible outline. The reduced-motion media query disables animations and transitions.

## Run the example

From the repository root, start a local server:

```bash
python3 -m http.server 8000
```

Open this address in your browser:

http://localhost:8000/javascript/asynchronous/sequencing-animations/start/

## Run the regression test

Playwright 1.65.1 is required. From the repository root, run:

```bash
node tests/course/r18-t009.mjs
```

The test starts and stops its own local server and checks reduced-motion behavior, static layout, keyboard focus at two viewport widths, and browser errors.