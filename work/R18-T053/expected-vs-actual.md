# R18-T053 Expected vs Actual Results

## Test Matrix

| Scenario / Check | Test Action | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **1. Baseline Normal Loading** | Load `index.html` with valid media | HTTP 200, `<video>`, `.controls`, buttons, and attribution `<a>` present and visible; error banner hidden | All elements loaded; controls visible; error banner hidden | PASS |
| **1. Baseline Play/Stop Interactivity** | Click `.play` then `.stop` | Play toggles to pause icon (`u`), stop resets icon to `P` and time to 0 | Button attributes toggle as expected | PASS |
| **2. Media Error Fallback Display** | Simulate 404 on media assets | `.media-error-msg` banner becomes visible with role="alert" | Banner visible with alert role | PASS |
| **2. Direct Video Fallback Link** | Inspect link inside error message | `<a>` tag points to direct video file (`video/sintel-short.mp4`) | Direct link present and correct | PASS |
| **2. Safe Control Disabling** | Check button states during media error | `.play`, `.stop`, `.rwd`, `.fwd` disabled; clicking does not throw uncaught errors | Buttons disabled; zero uncaught exceptions | PASS |
| **3. Media Recovery** | Dynamically supply valid media source and call `load()` | `.media-error-msg` hides; buttons re-enable; playback resumes | Banner hidden; buttons enabled; playback active | PASS |
| **4. Static Empty Fixture** | Load `fixtures/video-empty.html` | Status alert indicates no video specified; controls disabled | Empty notice displayed; controls disabled | PASS |
| **5. Missing Font Fallback** | Simulate 404 on webfont assets | Buttons render legible fallback characters and retain `aria-label` | Fallback character `P` legible; `aria-label="play pause toggle"` | PASS |
| **Zero Unexpected Errors** | Across all test scenarios | No unhandled rejections, page errors, or unexpected console errors | 0 errors detected | PASS |
