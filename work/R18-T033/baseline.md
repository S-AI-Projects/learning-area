# R18-T033 Baseline Results

Target page: `accessibility/multimedia/audio-transcript-ui/index.html`
Base revision: `2197326ba859ff3477919087b488157f9d618a6` (`upstream/main`)

## Page Classification
- Page type: Interactive multimedia and accessibility demonstration.
- Teaching purpose: Demonstrates custom audio controls (play/pause, stop, seek forward/rewind, time label) synchronized with an expandable text transcript.
- Source anchors:
  - `audio`: Contains native `<audio controls>` element with `<source>` tags for `viper.mp3` and `viper.ogg`.
  - `a`: Fallback link inside `<audio>` element (`<a href="../viper.mp3">link to the audio</a>`).
  - `button`: Custom control buttons (`.playpause`, `.stop`, `.rwd`, `.fwd`) and transcript disclosure button (`.transcript-container button`).

## Baseline Observations (Parent Revision)
- **Normal state:**
  - `main.js` removes native `controls` attribute and activates custom buttons.
  - Clicking "Show transcript" expands `.transcript` from `0px` to `150px` and changes button label to "Hide transcript". Clicking again collapses to `0px`.
- **Defects / Gaps identified during asset failure:**
  - If audio assets (`viper.mp3`, `viper.ogg`) fail to load (network 404, abort, or decoding failure), no error banner or fallback message is presented to the user.
  - The custom buttons remained in their default state, and attempting to invoke `.play()` on an unplayable audio element led to unhandled promise rejections / failed state.
  - If a transcript is completely empty, clicking "Show transcript" opened a blank 150px empty box without any indication to the user.

## Changes Introduced
1. **Readable Fallback on Asset Failure:**
   - Added an `.audio-fallback` status alert that appears if audio sources fail to load or error out, giving the user a readable message and direct link to the audio file.
   - Disabled playback buttons gracefully without throwing uncaught errors.
2. **Asset Recovery:**
   - Bound recovery listeners (`canplay`, `loadeddata`) to automatically dismiss the fallback banner and re-enable custom controls when valid audio is restored.
3. **Static Empty Result Fixture:**
   - Created `accessibility/multimedia/audio-transcript-ui/fixtures/audio-transcript-empty.html` representing an audio example with no available transcript, displaying `<p class="empty-transcript">No transcript is available for this recording.</p>`.
