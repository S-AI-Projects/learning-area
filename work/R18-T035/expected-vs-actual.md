# R18-T035 Expected vs Actual

## Result: PASS ✅

| Assertion | Expected | Actual | Status |
|---|---|---|---|
| h1 text | "Hipster ipsum is the best" | "Hipster ipsum is the best" | ✅ |
| h2 count | 2 | 2 | ✅ |
| p count | ≥ 4 | 5 | ✅ |
| h1 font-family | includes "lobster" | "Lobster, cursive" | ✅ |
| p font-family | includes "raleway" | "Raleway, sans-serif" | ✅ |
| Horizontal overflow | scrollWidth ≤ clientWidth | 1280 ≤ 1280 | ✅ |
| h1 font-size | ~40px | 40px | ✅ |
| body width | ≤ 800px | 800px | ✅ |
| Page errors | [] | [] | ✅ |
| Cross-context consistency | pass1 === pass2 | identical | ✅ |

## Notes
- Google Fonts request (`fonts.googleapis.com`) was **intercepted and stubbed** — no network call made
- Both fresh browser contexts produced **identical DOM snapshots**
- No code changes were made to the HTML or CSS — this is a baseline-correct page; the contribution is the regression test + fixture stub
