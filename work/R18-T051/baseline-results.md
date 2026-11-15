# R18-T051 Baseline Observations

## Target
`css/css-layout/practical-positioning-examples/fixed-info-box.html`

## Environment
- OS: macOS 26.6.2 (Apple Silicon)
- Node.js: v26.13.0
- Playwright: 1.65.1
- Browser: Chromium 159.0.8154.6 (Playwright Headless)

## Baseline State Inspection

Before modifications:

1. **Initial Tab Focus**:
   - `tabs-manual.js` initializes tabs on `window.load`.
   - `#tab-1` is set to `aria-selected="true"` with its `tabindex` attribute removed (defaulting to natural tabIndex 0 for `<button>`).
   - `#tab-2` and `#tab-3` have `tabindex="-1"` and `aria-selected="false"`.
   - First `Tab` press reaches `#tab-1`.
   - Visible focus indicator exists on `#tab-1 span` via CSS `.info-box [role="tab"]:focus span`.

2. **Arrow Key Traversal**:
   - `ArrowRight`, `ArrowLeft`, `Home`, and `End` traverse focus between the tabs (`#tab-1`, `#tab-2`, `#tab-3`) with circular wrapping as implemented in `tabs-manual.js`.

3. **Keyboard Activation**:
   - Pressing `Enter` or `Space` on an inactive tab activates it via native button click events, updating `aria-selected` and toggling the `.is-hidden` CSS class on corresponding panels.

4. **Tabpanel Traversal Defect**:
   - When focused on `#tab-1`, pressing `Tab` failed to move focus to `#tabpanel-1`.
   - Because `<article id="tabpanel-1" role="tabpanel" aria-labelledby="tab-1">` lacked `tabindex="0"`, focus bypassed the panel completely and landed on `<body>` (or exited the document).
   - Keyboard users could not navigate into the panel content using standard ARIA APG tab sequence.
   - Furthermore, tabpanels lacked explicit focus indicator styling.

## Required Improvements
1. Add `tabindex="0"` to each tabpanel article element (`#tabpanel-1`, `#tabpanel-2`, `#tabpanel-3`) so the active panel is reachable in the keyboard tab sequence.
2. Add explicit `:focus` outline styling for `.info-box [role="tabpanel"]` to provide clear focus visibility without altering layout or teaching intent.
3. Add a strict automated Playwright regression test suite (`tests/course/r18-t051.mjs`).
4. Document the example and test commands in `README.md`.
