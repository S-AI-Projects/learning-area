# R18-T032 Test Inputs

## Target
`html/introduction-to-html/getting-started/index.html`

## Tested Viewports
1. **Mobile:**
   - Width: 360 px
   - Height: 800 px
   - Device Scale Factor: 1
2. **Desktop:**
   - Width: 1280 px
   - Height: 800 px
   - Device Scale Factor: 1

## Server Setup
- Ephemeral static HTTP server listening on loopback `127.0.0.1:0`.
- Path traversal protection verifying file requests stay inside repository root.
- Correct MIME type mapping (`.html`, `.css`, `.js`, `.svg`, `.png`).
- Clean teardown on success or failure.

## Browser Environment
- Engine: Chromium (Playwright headless)
- Version: 159.0.8154.6
- Fresh isolated browser context instantiated per viewport test.

## Target Elements & Assertions
- `document.documentElement` & `document.body`: Assert `scrollWidth <= clientWidth` (zero unintended horizontal overflow).
- Content element `p`: Assert rendered inside viewport (`x >= 0`, `right <= viewport.width`, `y >= 0`, `bottom <= viewport.height`).
- Assert element style: `visibility: visible`, `display: block` (not none), `opacity: 1`.
- Content integrity: Title is `"My test page"` and text content matches `"This is my page"`.
- DOM hierarchy & order: `body` direct children strictly match `['p']`.
- Accessibility: Zero elements with positive `tabindex`.
- Network & Console: Zero server errors, zero uncaught page errors, zero console errors, zero failed requests.
