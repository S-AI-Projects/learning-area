# R18-T053 Baseline Observations

## Target Page
`javascript/apis/video-audio/start/index.html`

## Source Anchors
- `video`: HTML5 video player container and media sources
- `button`: Custom control buttons (`.play`, `.stop`, `.rwd`, `.fwd`)
- `a`: Attribution anchor link (`studio.blender.org/films/sintel/`)

## Baseline State Inspection

1. **Missing Script & Control Visibility**:
   - `index.html` linked `<script src="custom-player.js"></script>`, which was missing in `start/`.
   - Without the player script, custom buttons `.controls` remained hidden (`visibility: hidden`).
2. **Missing Media Fallback**:
   - Inside `<video controls>`, line 14 contained an empty placeholder comment: `<!-- fallback content here -->`.
   - No readable message or direct video link was offered to users if video playback or media loading failed.
3. **No Error Banner or Recovery Mechanism**:
   - If media files were missing or threw errors, no status banner was presented.
   - Interactive buttons lacked disabled states when media failed, leading to potential uncaught promise rejections on `play()`.
4. **Missing Empty Result Fixture**:
   - No fixture existed representing an empty media state with unconfigured video sources.
5. **Icon Font Fallback**:
   - The custom buttons relied solely on the Heydings icon webfont without declared generic fallbacks.

## Required Remediation
1. Implement `custom-player.js` with comprehensive media error detection, button disabling, safe play/pause handling, and recovery mechanisms.
2. Provide readable alert fallback (`.media-error-msg`) and direct link inside `<video>`.
3. Add font fallback styling (`font-family: HeydingsControlsRegular, sans-serif`).
4. Add static empty result fixture at `javascript/apis/video-audio/start/fixtures/video-empty.html`.
5. Add automated Playwright regression suite (`tests/course/r18-t053.mjs`) covering all 5 scenarios.
