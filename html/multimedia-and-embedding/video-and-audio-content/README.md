# Video and audio content examples

These examples demonstrate HTML media elements and native browser controls.

## Keyboard accessibility

The `simple-video.html` example uses native HTML video controls. In Chromium, Tab reaches the video and Space starts playback when the video has keyboard focus. The browser focus indicator should remain visible.

The fallback link inside the video element is intended for browsers without HTML video support. It is not normally rendered when native video support is available.

## Run the keyboard regression test

From the repository root:

```bash
npm install
npx playwright install chromium
node tests/course/r18-t041.mjs
```

The test starts a temporary local HTTP server and launches Chromium.
