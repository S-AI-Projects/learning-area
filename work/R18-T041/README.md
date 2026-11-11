# R18-T041 — Keyboard Accessibility

## Objective
Verify keyboard accessibility of the MDN simple video example.

## Target
`html/multimedia-and-embedding/video-and-audio-content/simple-video.html`

## Baseline findings
The original example already uses native HTML5 video controls.

Chromium confirmed:
- Tab reaches the video element.
- Keyboard focus is visible.
- Space starts video playback.
- Video metadata loads successfully.

## Implementation
The educational HTML was already keyboard-accessible, so its behaviour was preserved.

Added a Playwright regression test at `tests/course/r18-t041.mjs`.

## Run
From the repository root:

    npm install
    npx playwright install chromium
    npm run test:course:r18-t041

## Verification
All nine automated checks passed:

1. Page and heading load.
2. Native video controls are enabled.
3. Video metadata and dimensions load.
4. No positive `tabindex` values are present.
5. Tab reaches the video element.
6. Keyboard focus is visible.
7. Space starts video playback.
8. Space pauses video playback.
9. No unexpected page errors occur.

## Environment
- Node.js 26.8.1
- npm 11.19.0
- Playwright 1.65.0
- Chromium
