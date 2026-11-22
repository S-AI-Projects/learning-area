# Custom Media Controls (OOJS)

A JavaScript object-oriented example that replaces the native browser controls for `<audio>` and `<video>` elements with custom controls built from scratch.

## What This Example Demonstrates

- Querying all `<audio>` and `<video>` elements on a page
- Removing native browser controls (`removeAttribute('controls')`)
- Using a constructor function (`PlayerController`) to create reusable OOP-style controller objects
- Dynamically creating and appending DOM elements for custom play/pause, stop, rewind, forward, and time-display controls
- Updating a time label using the `ontimeupdate` event

## Source Anchors

| Anchor | Element | Role |
|--------|---------|------|
| `audio` | `<audio controls>` | Audio player (viper.mp3 / viper.ogg) |
| `a` | `<a href="../viper.mp3">` / `<a href="../rabbit320.mp4">` | Fallback links for browsers without HTML5 media support |
| `video` | `<video controls>` | Video player (rabbit320.mp4 / rabbit320.webm) |

## Safe Text Rendering

All fixture text in this example is set via `textContent` assignments (e.g. `playpause.textContent = 'Play'`), which is the **safe** method. Using `textContent` guarantees:

- No HTML is parsed or injected
- No child elements are created
- No script execution can be triggered by the text value

This is in contrast to `innerHTML`, which would parse the string as HTML and potentially create injected elements or execute scripts.

## Running the Example

Open `index.html` via a local HTTP server (do **not** open as a `file://` URL, as media elements may be blocked):

```bash
# From the repo root:
npx serve .
# Then navigate to: http://localhost:3000/accessibility/multimedia/custom-controls-OOJS/
```

## Running the Automated Test

```bash
# From the repo root:
node tests/course/r18-t058.mjs
```

The test starts a local HTTP server automatically, runs Playwright in headless Chromium, and exits with code 0 on success or non-zero on failure.

## Files

| File | Description |
|------|-------------|
| `index.html` | Main HTML page with `<audio>` and `<video>` elements |
| `main.js` | OOP controller: creates and wires the custom controls |
| `../custom-controls.css` | Shared CSS for custom player controls |

## Related MDN Article

[Creating a cross-browser video player](https://developer.mozilla.org/en-US/docs/Web/Media/Audio_and_video_delivery/cross_browser_video_player)
