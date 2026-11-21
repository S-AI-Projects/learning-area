# R18-T032 Expected vs Actual Results

| Check / Metric | Viewport | Expected | Actual | Status |
|---|---|---|---|---|
| Server readiness probe | Any | HTTP 200 OK | HTTP 200 OK | PASS |
| Page title | 360×800 | "My test page" | "My test page" | PASS |
| Page title | 1280×800 | "My test page" | "My test page" | PASS |
| Content text | 360×800 | "This is my page" | "This is my page" | PASS |
| Content text | 1280×800 | "This is my page" | "This is my page" | PASS |
| Content order | 360×800 | `['p']` | `['p']` | PASS |
| Content order | 1280×800 | `['p']` | `['p']` | PASS |
| Horizontal overflow | 360×800 | `scrollWidth <= clientWidth` (`false`) | `scrollWidth: 360, clientWidth: 360` (`false`) | PASS |
| Horizontal overflow | 1280×800 | `scrollWidth <= clientWidth` (`false`) | `scrollWidth: 1280, clientWidth: 1280` (`false`) | PASS |
| Content bounds (x >= 0) | 360×800 | `>= 0` | `x = 8px` | PASS |
| Content bounds (right <= viewport) | 360×800 | `<= 360px` | `right = 352px` | PASS |
| Content bounds (x >= 0) | 1280×800 | `>= 0` | `x = 8px` | PASS |
| Content bounds (right <= viewport) | 1280×800 | `<= 1280px` | `right = 1272px` | PASS |
| Content clipping | Both | Not clipped | Fully inside viewport | PASS |
| Unintended scroll regions | Both | None | None | PASS |
| Positive tabindex count | Both | `0` | `0` | PASS |
| Local server errors | Both | `0` | `0` | PASS |
| Browser & page errors | Both | `0` | `0` | PASS |
| Failed network requests | Both | `0` | `0` | PASS |
| Test suite exit code | Both | `0` on pass, non-zero on failure | `0` | PASS |
