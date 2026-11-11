# R18-T042 — Baseline and test results

## Target
html/multimedia-and-embedding/responsive-images/responsive.html

## Baseline
- Both content images loaded successfully.
- The first image uses the responsive picture element.
- The second image uses srcset and sizes.
- Both images have meaningful alt text.
- Images use display: block and max-width: 100%.
- The image-credit link points to Flickr.

## Failure fixture
The test server provides:
`/__fixtures__/r18-t042-missing-image.jpg`

Expected response: HTTP 404.

Observed behavior:
- Image error event fired.
- naturalWidth was zero.
- Existing alt text remained available.

## Recovery
The test restored the original picture source and image attributes.
The image loaded successfully again.

## Browser regression result
Command: node tests/course/r18-t042.mjs

Result: PASS — 11 checks.

Environment:
- Node.js v26.8.1
- npm 11.19.0
- Playwright 1.65.0
- Chromium

## Source changes
The original responsive HTML page did not require modification.
Its native image fallback and alternative text behaved correctly.
