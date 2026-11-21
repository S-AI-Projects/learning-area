# R18-T031 Expected vs Actual Results

| Check / Assertion | Expected | Actual | Status |
|---|---|---|---|
| Baseline skip link presence | Absent (`0`) | `0` | PASS |
| Baseline Tab focus | `BODY` remains active | `BODY` | PASS |
| Changed skip link presence | Exactly one `a.skip-link` targeting `#alice-container` | Exactly one `a.skip-link` (`href="#alice-container"`) | PASS |
| Skip link initial state | Positioned off-screen (`rect.top < 0`) | `rect.top < 0` (top: -100px) | PASS |
| Changed Tab navigation | First Tab key press focuses the skip link | `document.activeElement === skipLink` | PASS |
| Skip link visible focus styling | High-contrast outline (`>= 1px`), visibility visible, opacity > 0 | `outline: 3px solid #ffbf47`, `visibility: visible`, `opacity: 1` | PASS |
| Skip link viewport position | Rendered bounding rect fully inside viewport | `x: 10`, `y: 10`, `right: 161.56`, `bottom: 52` (inside 1280x720) | PASS |
| Enter keyboard activation | URL hash updates to `#alice-container` | `location.hash === "#alice-container"` | PASS |
| Container focus transfer | `#alice-container` receives focus upon activation | `document.activeElement === aliceContainer` | PASS |
| Demonstration CSS preservation | `body` display flex + center; `#alice-container` display grid + place-items center | Unaltered (`body` flex/center, `#alice-container` grid/place-items center) | PASS |
| Teaching images preservation | All 3 Alice images preserved with ids `alice1`, `alice2`, `alice3` | Preserved (`["alice1", "alice2", "alice3"]`) | PASS |
| Tabindex safety | Zero positive `tabindex` attributes | `0` positive tabindex attributes | PASS |
| Local server errors | None | `0` | PASS |
| Browser & console errors | None | `0` | PASS |
| Failed network requests | None | `0` | PASS |
| Overall test execution status | Exit code 0 on pass, non-zero on failure | Exit code `0` | PASS |
