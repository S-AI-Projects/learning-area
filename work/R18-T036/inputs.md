# R18-T036 Inputs

## Page under test
`html/multimedia-and-embedding/video-and-audio-content/simple-video.html`

## Feature demonstrated
HTML5 `<video>` element with graceful degradation:
- **Feature-present path**: Chromium natively supports `video/webm` → `<video controls>` renders
- **Feature-absent path**: Browser cannot play the video type → fallback `<p><a>` link is shown

## Pass A — Feature-present inputs
| Input | Value |
|---|---|
| Browser | Chromium (headless) |
| Viewport | 1280 × 800 |
| `canPlayType('video/webm')` | returns `"probably"` (native support) |
| Network | local static server only |

## Pass B — Feature-absent inputs (stubbed)
| Input | Value |
|---|---|
| Browser | Chromium (headless) |
| Viewport | 1280 × 800 |
| `canPlayType` stub | `addInitScript` overrides `HTMLVideoElement.prototype.canPlayType` to return `""` for `video/webm` |
| Stub rationale | Explicit and honest — documents the fallback contract without pretending the native API doesn't exist |
| Asset existence check | `fs.existsSync(rabbit320.webm)` on disk |
| Network | local static server only |

## Assertions
**Pass A (feature-present):**
1. Exactly 1 `<video>` element present
2. `video[src]` includes `rabbit320.webm`
3. `controls` attribute present
4. `<video>` is visible
5. Fallback `<a>` exists in DOM with correct `href`
6. No uncaught page errors

**Pass B (feature-absent):**
1. Fallback `<a>` exists in DOM with correct `href`
2. Fallback link text is non-empty
3. `rabbit320.webm` exists on disk (asset is reachable)
4. Fallback `<p>` contains "doesn't support"
5. `canPlayType` stub returns `""` for `video/webm`
6. No uncaught page errors
