# R18-T034 Test Inputs

## Target
`javascript/apis/third-party-apis/youtube/index.html`

## Source Anchors
- `#search`: Input element (`<input type="text" id="search" class="search" required>`).
- `.submit`: Form submission button.
- `section`: Result container for video player frames.

## Stubs (Offline Determinism)
- `https://apis.google.com/js/client.js`: Intercepted via Playwright route fulfilling stubbed `gapi.client.youtube.search.list` returning 2 mock search items.
- `https://www.youtube.com/iframe_api`: Intercepted via Playwright route fulfilling mock `YT.Player` constructor with simulated `onReady` dispatch.

## Test Scenarios
1. **Scenario 1 — Baseline Anchor Inspection:**
   - Verify `#search` exists, is required, has visible computed layout.
2. **Scenario 2 — Repeated Initialization & Interaction:**
   - Call `onYouTubeApiLoad()` twice to test initialization idempotency.
   - Execute search for "javascript tutorial".
   - Execute second search for "web components".
   - Verify search request count = 2 (1 per interaction) and rendered video elements = 2 (not duplicated to 4).
3. **Scenario 3 — Isolated Style Toggle Harness:**
   - Execute `initializeDemo()` twice.
   - Assert single `#r18-toggle` and `#r18-status` element created.
   - Toggle 1: Outline width becomes `4px`, status becomes `"Highlight is on"`, updates = 1.
   - Toggle 2: Outline width becomes `0px`, status becomes `"Highlight is off"`, updates = 2.
   - Execute `cleanupDemo()`:
     - Verify test DOM elements removed.
     - Verify clicks on detached element trigger no updates.
     - Verify zero active timers or listeners remain.

## Environment
- Server: Ephemeral static HTTP server on `127.0.0.1:0`.
- Browser: Chromium headless via Playwright 1.65.1.
- Viewport: 1280x800.
