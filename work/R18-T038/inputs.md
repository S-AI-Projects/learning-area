# R18-T038 Inputs

## Target Page
`javascript/oojs/assessment/index.html`

## Companion Page
`javascript/oojs/assessment/text-rendering.html`

## Source Anchor
`canvas`

## Test Payload
`<img src=x onerror="alert(1)"><script>window.__injected=true</script>`

## Rationale
Demonstrates safe text rendering where dynamic strings or user inputs are treated strictly as text data rather than executable HTML markup.

## Test Environment & Configuration
| Parameter | Value |
|---|---|
| Test runner | Node.js Playwright (`tests/course/r18-t038.mjs`) |
| Local server | Node.js HTTP server (`http://127.0.0.1:<PORT>`) |
| Browser | Chromium (headless) |
| Viewport | 1280 × 800 |
| Network mode | Local static server only |

## Passes & Verification Steps
1. **Pass 1: Main Canvas Page Verification**
   - Check `<canvas>` sizing and rendering.
   - Check initial `<p>` text.
   - Inject test payload into `para.textContent` to verify dynamic fixture safety.
   - Verify 0 injected elements and 0 alert triggers.
   - Screenshot: `work/R18-T038/baseline-main.png`.
2. **Pass 2: Companion Safe Text-Rendering Page**
   - Fill `#user-text` with `<img src=x onerror="alert(1)"><script>window.__injected=true</script>`.
   - Click `#show-text`.
   - Assert `#output.textContent` equals payload literally.
   - Assert 0 injected `<img>` and `<script>` elements.
   - Assert 0 dialog events and `window.__injected === false`.
   - Assert computed block layout and visibility.
   - Screenshot: `work/R18-T038/companion-safe-render.png`.
