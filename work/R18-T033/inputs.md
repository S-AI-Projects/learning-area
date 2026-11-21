# R18-T033 Test Inputs

## Target
`accessibility/multimedia/audio-transcript-ui/index.html`

## Static Fixture
`accessibility/multimedia/audio-transcript-ui/fixtures/audio-transcript-empty.html`

## Test Scenarios & Interceptions
1. **Scenario 1 — Baseline Normal Behavior:**
   - URL: `http://127.0.0.1:<port>/accessibility/multimedia/audio-transcript-ui/index.html`
   - Assets: `viper.mp3`, `viper.ogg` allowed to load normally.
   - User interactions: Click "Show transcript", then click "Hide transcript".
2. **Scenario 2 — Failed Asset Request:**
   - Interception: Network route aborts all requests matching `**/*.{mp3,ogg}`.
   - Verification: `.audio-fallback` banner becomes visible, controls become disabled, clicking controls throws no uncaught errors.
3. **Scenario 3 — Asset Restoration & Recovery:**
   - Restoration: Unroute audio requests, trigger media recovery.
   - Verification: `.audio-fallback` banner hides, controls re-enable.
4. **Scenario 4 — Static Empty Result Fixture:**
   - URL: `http://127.0.0.1:<port>/accessibility/multimedia/audio-transcript-ui/fixtures/audio-transcript-empty.html`
   - Interaction: Click "Show transcript".
   - Verification: `.empty-transcript` is displayed with descriptive message `"No transcript is available for this recording."`.

## Browser & Server Environment
- Server: Ephemeral static HTTP server on loopback `127.0.0.1:0`.
- Browser: Chromium headless via Playwright 1.65.1.
- Viewport: 1280x800.
