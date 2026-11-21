# R18-T036 Baseline

## Page
`html/multimedia-and-embedding/video-and-audio-content/simple-video.html`

## Purpose
Demonstrates the HTML5 `<video>` element with native browser controls and an explicit fallback for unsupported browsers.

## Structure
- **No external scripts or stylesheets**
- `<h1>` heading
- `<video src="rabbit320.webm" controls>` — single-source video with browser controls
  - Fallback content (rendered only when `<video>` is unsupported):
    `<p>Your browser doesn't support HTML5 video. Here is a <a href="rabbit320.webm">link to the video</a> instead.</p>`

## Source anchors
| Anchor | Role |
|---|---|
| `video` | HTML5 video player (feature-present path) |
| `a` | Fallback download link inside `<video>` (feature-absent path) |

## Baseline observations
| Property | Value |
|---|---|
| `video[src]` | `rabbit320.webm` |
| `controls` attribute | present |
| `video` visible | true |
| Fallback `<a href>` | `rabbit320.webm` |
| Fallback text | "link to the video" |
| Horizontal overflow | none |
| Page errors | none |

## Assessment
Baseline behavior is **already correct**. Both the feature-present and feature-absent paths are well-implemented. The contribution is a regression test that explicitly tests both paths without manufacturing defects.
