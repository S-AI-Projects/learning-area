# R18-T021 Test Inputs

Target:
http://127.0.0.1:4178/html/introduction-to-html/getting-started/index.html

Browser:
Playwright Chromium

Fresh browser context:
Yes

Keyboard inputs:
1. Tab
2. Enter

DOM elements:
- a.skip-link
- main#main-content

Assertions:
- Main landmark exists exactly once.
- Original paragraph remains unchanged.
- Skip link points to #main-content.
- Tab focuses the skip link.
- Focus indicator is visible.
- Enter activates the skip link.
- Main content receives focus.
- No positive tabindex values exist.
- No unexpected browser errors occur.
