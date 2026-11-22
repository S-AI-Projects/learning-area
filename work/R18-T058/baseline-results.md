# R18-T058 — Baseline Results

## Task
**Safe text rendering** for `accessibility/multimedia/custom-controls-OOJS/index.html`

## Baseline Behavior (Before Changes)

The example already uses `textContent` for all fixture text:

| Location | Code | Safe? |
|----------|------|-------|
| `main.js` line 109 | `playpause.textContent = 'Play'` | ✅ Yes |
| `main.js` line 110 | `stop.textContent = 'Stop'` | ✅ Yes |
| `main.js` line 111 | `rwd.textContent = 'Rwd'` | ✅ Yes |
| `main.js` line 112 | `fwd.textContent = 'Fwd'` | ✅ Yes |
| `main.js` line 113 | `time.textContent = '00:00'` | ✅ Yes |
| `main.js` line 39 | `playPauseBtn.textContent = 'Pause'` | ✅ Yes |
| `main.js` line 42 | `playPauseBtn.textContent = 'Play'` | ✅ Yes |
| `main.js` line 49 | `playPauseBtn.textContent = 'Play'` | ✅ Yes |
| `main.js` line 61 | `playPauseBtn.textContent = 'Play'` | ✅ Yes |
| `main.js` line 84 | `timeLabel.textContent = mediaTime` | ✅ Yes |
| `index.html` line 18 | `<a href="...">link to the audio</a>` | ✅ Yes |
| `index.html` line 28 | `<a href="...">link to the video</a>` | ✅ Yes |

**All fixture text is already safe.** The contribution is a regression test (`tests/course/r18-t058.mjs`) that:
- Documents and verifies the existing safe behavior
- Guards against future regressions where `innerHTML` might accidentally replace `textContent`

## Environment

- Node.js: v26.13.0
- Playwright: 1.65.1
- Chromium (Playwright bundled)
- OS: macOS

## Source Anchors Verified

- `audio` → `<audio controls>` element present ✅
- `a` → Fallback links inside `<audio p>` and `<video p>` present ✅
- `video` → `<video controls>` element present ✅
