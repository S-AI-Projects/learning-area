# R18-T041 Baseline Results

## Environment
- Node.js: v26.8.1
- npm: 11.19.0
- Playwright: 1.65.0
- Browser: Chromium (Playwright)

## Target
html/multimedia-and-embedding/video-and-audio-content/simple-video.html

## Observed results
- Native video controls: enabled
- Video loaded: readyState 4
- Duration: 7.8 seconds
- Dimensions: 320 × 240
- First Tab reaches the VIDEO element
- Keyboard focus is visible (:focus-visible = true)
- Space starts playback
- Playback advanced to approximately 0.45 seconds

## Baseline conclusion
The existing example supports keyboard access and native media controls.
No HTML or CSS modification is necessary. Add automated regression
coverage and documentation without changing the educational example.
