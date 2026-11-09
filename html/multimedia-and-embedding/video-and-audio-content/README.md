# Video and Audio Content Examples

This directory contains examples demonstrating HTML video and audio elements and native browser media controls.

## Example: Simple Video

File: `simple-video.html`

This example uses the HTML5 `<video>` element with native browser controls. The video source is `rabbit320.webm`.

## 1. Requirements

- macOS, Windows, or Linux
- Google Chrome or another modern browser
- Python 3 (for the local development server)

## 2. Open the Example Using a Local Server

Open Terminal and navigate to the repository root:

```bash
cd ~/NST-SAI-2026/learning-area
```

Start the local HTTP server:

```bash
python3 -m http.server 8000
```

Keep this Terminal window open while testing.

Open the following address in your browser:

http://localhost:8000/html/multimedia-and-embedding/video-and-audio-content/simple-video.html

The video should appear with native browser controls, including Play/Pause, seek, volume, and fullscreen.

To stop the server, return to Terminal and press `Ctrl + C`.

## 3. Manual Keyboard Accessibility Test

Use the following procedure to test the actual video player in the browser.

1. Refresh the example page.
2. Press `Tab` to move keyboard focus to the video controls.
3. Observe the visible focus indicator (blue outline in the tested Chrome environment).
4. Continue pressing `Tab` to move between available controls.
5. Focus the Play/Pause control and press `Space` to start or pause playback.
6. Focus the seek bar and use `Left Arrow` and `Right Arrow` to move backward and forward.
7. Focus the volume control and use `Left Arrow` and `Right Arrow` to adjust volume.
8. Focus the fullscreen control and press `Space` or `Enter` to enter fullscreen.
9. Press `Escape` to exit fullscreen.
10. Use `Shift + Tab` to navigate backward through focusable controls.

### Important keyboard behavior

Keyboard input operates on the currently focused control. For example, `Space` activates the Play/Pause button when that button has focus. It is not expected to toggle video playback globally when focus is on another control.

Native media controls are implemented by the browser. Their exact appearance and focus behavior can vary between browsers and operating systems.

## 4. Automated Regression Test

The repository includes a Playwright test for keyboard accessibility.

Install the project dependencies:

```bash
npm install
```

Install the Playwright Chromium browser:

```bash
npx playwright install chromium
```

Run the R18-T041 test from the repository root:

```bash
node tests/course/r18-t041.mjs
```

Alternatively, use the npm script:

```bash
npm run test:course:r18-t041
```

The test starts a temporary local HTTP server, launches Chromium, checks the example page and video metadata, and verifies the keyboard interactions implemented in the automated test.

The automated test and the manual browser test are complementary. Manual checks cover native browser controls that may not be directly exposed through the regular page DOM.

## 5. Manual Test Evidence

Manual testing was performed using Google Chrome on a MacBook Air.

The following interactions were observed:

- Tab navigation visibly focused the native video controls.
- Space activated Play/Pause when the corresponding control was focused.
- Arrow keys changed the playback position when the seek bar was focused.
- Arrow keys adjusted volume when the volume control was focused.
- Space activated fullscreen when the fullscreen control was focused.
- Escape exited fullscreen.

These results are manual observations from the tested environment, not claims that every browser implements native media controls identically.

## 6. Troubleshooting

**Port 8000 is already in use:**

Stop the previous server with `Ctrl + C`, or use another port:

```bash
python3 -m http.server 8001
```

Then open:

http://localhost:8001/html/multimedia-and-embedding/video-and-audio-content/simple-video.html

**Video does not load:**

Make sure the server was started from the repository root and that `rabbit320.webm` exists in this directory.

**Browser does not show the expected focus outline:**

Check the browser and operating system keyboard-navigation settings. Native media control focus indicators can vary between environments.

**Favicon 404 message:**

A missing `favicon.ico` request does not prevent the video example from working.
