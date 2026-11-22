# R18-T040 Baseline

## Page
`accessibility/multimedia/custom-controls-OOJS/index.html`

## Entry Point & Setup
- **Page entry point**: `http://127.0.0.1:<PORT>/accessibility/multimedia/custom-controls-OOJS/index.html`
- **Setup command**: `npm install && node tests/course/r18-t040.mjs`

## Purpose
Demonstrates an Object-Oriented JavaScript media controller pattern (`PlayerController`) that instantiates custom accessible UI controls for both an `<audio>` and a `<video>` element on the same page. Native browser controls are removed and replaced by custom `<button>` elements (Play/Pause, Stop, Rewind, Forward) and time displays.

## Structure & Linked Assets
- **External assets**:
  - `custom-controls.css`: Styles `.player` (width: 480px), `.controls` (height: 36px), control buttons, and time labels.
  - `main.js`: Collects all `audio` and `video` elements, removes their native `controls` attribute, builds custom control DOM nodes, and instantiates a `PlayerController` for each media element.
  - Media assets: `viper.mp3`, `viper.ogg`, `rabbit320.mp4`, `rabbit320.webm`.

## Source Anchors
| Anchor | Element | Role & Purpose |
|---|---|---|
| `audio` | `<audio controls>` | Audio media player element; controls attribute removed dynamically and managed via `PlayerController`. |
| `video` | `<video controls>` | Video media player element; controls attribute removed dynamically and managed via `PlayerController`. |
| `a` | `<a href="...">` | Fallback direct download links inside `<audio>` and `<video>` for legacy browsers lacking HTML5 media support. |

## Baseline Observations (Correct State)
| Property | Expected / Specified | Actual Value | Status |
|---|---|---|---|
| Audio element count | 1 | 1 | Matched |
| Video element count | 1 | 1 | Matched |
| Fallback `<a>` links | 2 (one per media) | 2 | Matched |
| Native `controls` on audio | Removed (`false`) | `false` | Matched |
| Native `controls` on video | Removed (`false`) | `false` | Matched |
| Injected `.controls` containers | 2 | 2 | Matched |
| Play/Pause button initial text | `'Play'` | `'Play'` | Matched |
| Stop button initial text | `'Stop'` | `'Stop'` | Matched |
| Time label initial text | `'00:00'` | `'00:00'` | Matched |
| `.player` computed width | `480px` | `480px` | Matched |
| `.controls` computed height | `36px` | `36px` | Matched |
| Video play click event | Toggles text to `'Pause'`, starts playback | `text === 'Pause'`, `paused === false` | Matched |
| Video stop click event | Resets text to `'Play'`, resets `currentTime = 0` | `text === 'Play'`, `currentTime === 0` | Matched |
| Page errors | 0 | 0 | Matched |

## Deliberate Mutation Test Design
1. **Event Binding Mutation:** Via route interception on `main.js`, `playPauseBtn.onclick` is severed. Clicking the button leaves text as `'Play'` and media stays paused, which fails the play assertion and verifies regression detection.
2. **Style Rule Mutation:** Via route interception on `custom-controls.css`, `.controls` is styled with `display: none; height: 0px;`. Custom controls become invisible, which fails the layout visibility assertion.
3. **Pristine Application State:** The repository source files on disk (`main.js`, `custom-controls.css`, `index.html`) were not permanently edited, satisfying Step 2 and Done When criteria.
