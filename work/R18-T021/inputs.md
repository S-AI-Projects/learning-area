# R18-T021 Test Inputs

Target:
/html/introduction-to-html/getting-started/index.html

Server:
Temporary local static HTTP server on an available loopback port.

Browser:
Playwright Chromium 158.0.8127.18

Fresh browser context:
Yes

Screenshot evidence:
- `work/R18-T021/baseline.png`: parent-revision page after Tab.
- `work/R18-T021/changed-focused.png`: changed page after Tab, showing the
  focused skip link.
- Both captured at 1280x720 with Chromium 158.0.8127.18.

Keyboard inputs:
1. Tab from the initial document state.
2. Enter while the skip link is focused.

DOM elements:
- a.skip-link
- main#main-content
- The unchanged paragraph in main.

Assertions:
- Main landmark exists exactly once.
- Original paragraph remains unchanged.
- Skip link points to #main-content.
- Tab focuses the skip link.
- Focus styling is active and the link's rendered rectangle is within the viewport.
- Enter activates the skip link, updates the URL fragment, and focuses main.
- No positive tabindex values exist.
- No unexpected server, page, console, or failed-request errors occur.
