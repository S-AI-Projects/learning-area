# R18-T035 Inputs

## Page under test
`css/web-fonts/google-font.html`

## External resource replaced
| Original URL | Replacement |
|---|---|
| `https://fonts.googleapis.com/css?family=Lobster\|Raleway` | Local stub CSS served via `page.route()` |

## Local font fixture
The stub CSS declares `@font-face` rules for `Lobster` and `Raleway` using fonts **already present in the repository**:
- `Lobster` → `/css/web-fonts/fonts/zantroke-webfont.woff2` + `.woff`
- `Raleway` → `/css/web-fonts/fonts/cicle_fina-webfont.woff2` + `.woff`

This keeps the test fully offline and deterministic.

## Viewport locked
`1280 × 800` for both browser contexts.

## Assertions
1. `h1` text equals `"Hipster ipsum is the best"`
2. `h2` count equals `2`
3. `p` count ≥ `4`
4. `h1` computed `font-family` includes `"lobster"` (case-insensitive)
5. First `p` computed `font-family` includes `"raleway"` (case-insensitive)
6. No horizontal overflow (`scrollWidth ≤ clientWidth`)
7. `h1` computed `font-size` ≈ `40px` (4rem × 10px base)
8. `body` width ≤ `800px` (max-width constraint)
9. No uncaught page errors
10. Both passes produce identical DOM snapshot
