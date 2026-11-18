# R18-T011 Accessibility Test and Check Summary

## Overview
- **Task Goal**: Ensure keyboard accessibility and Tab traversal for `tools-testing/cross-browser-testing/accessibility/bad-semantics.html`.
- **Target Page**: `tools-testing/cross-browser-testing/accessibility/bad-semantics.html`
- **Result**: Added an accessible, visually non-intrusive skip-to-content link targeting the main content region (`<main id="main" tabindex="-1">`) while strictly preserving the demonstrated CSS layout and educational purpose of the original bad-semantics example.
- **Test File**: `tests/course/r18-t011.mjs`

## How to Run the Checks
To run the automated Playwright regression test suite:
```bash
node tests/course/r18-t011.mjs
```

### Execution Flow:
1. Starts the documented local server using `python3 -m http.server 8000 --bind 127.0.0.1` from the repository root.
2. Polls `http://127.0.0.1:8000/tools-testing/cross-browser-testing/accessibility/bad-semantics.html` until readiness (HTTP 200).
3. Opens a fresh Playwright browser context in Chromium.
4. Performs strict behavioral assertions:
   - DOM: Verifies title, skip link anchor, target `#main` landmark, and preservation of teaching markup (`<font size="7">`, `<font size="5">`).
   - Unfocused Layout: Verifies skip link is off-screen/clipped and does not alter document layout or displace headings.
   - Tab Traversal: Verifies `Tab` key focuses `a.skip-link`.
   - Visible Focus: Verifies computed layout places the link inside the viewport with visible outline, border, and contrast.
   - Keyboard Activation: Verifies `Enter` key activates the link, updates the URL hash to `#main`, and moves focus to `<main id="main">`.
5. Captures screenshots to `work/R18-T011/`:
   - `unfocused.png`
   - `focused.png`
   - `activated.png`
6. Always terminates server and browser processes on completion or failure.
7. Exits with code `0` on success, or non-zero (`1`) on any assertion error.

## Artifacts in `work/R18-T011/`
- `baseline.md`: Pre-edit baseline assessment of scripts, styles, and accessibility barriers.
- `inputs.json`: Test parameters, target URL, and execution arguments.
- `expected-vs-actual.json`: Complete JSON verification dataset.
- `expected-vs-actual.md`: Markdown comparison table.
- `tool-versions.json`: Environment specifications and dependencies.
- `check-summary.md`: This summary document.
