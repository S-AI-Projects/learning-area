# R18-T006: Unsupported browser feature

## Feature

The example uses the HTMLMediaElement API for custom video playback controls: play, pause, stop, rewind, fast-forward, and playback timing.

## Baseline before changes

- Page returned HTTP 200.
- One video element was present, with native controls enabled.
- Custom controls were hidden.
- The referenced custom-player.js returned HTTP 404.
- No page errors were reported.

## Changes

- Added start/custom-player.js with feature detection.
- Supported browsers initialize custom controls.
- Unsupported browsers receive an explicit fallback message and retain native controls.
- Added Playwright regression tests for both paths.
- Added run instructions to the example README.

## Browser test results

Command: `node tests/course/r18-t006.mjs`

| Check | Result |
|---|---|
| Supported media API initializes custom controls | PASS |
| Play and stop update expected state | PASS |
| Custom controls have expected layout | PASS |
| Unsupported API displays fallback | PASS |
| Native controls remain enabled when unsupported | PASS |
| No unexpected browser errors | PASS |

## Test environment

- Node.js: v26.12.1
- Playwright: 1.65.1
- Browser: Playwright-managed Chromium

The unsupported path is simulated by disabling media play() and pause() methods before page load. No physical media hardware or permissions are required.
