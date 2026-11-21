# R18-T035 Baseline

## Page
`css/web-fonts/google-font.html`

## Purpose
Demonstrates using Google Fonts (`Lobster` and `Raleway`) via a `<link>` tag pointing to `https://fonts.googleapis.com/css?family=Lobster|Raleway`. Teaches how to load external web fonts into a CSS-styled page.

## Structure
- `<link>` to `https://fonts.googleapis.com/css?family=Lobster|Raleway` (external)
- `<link>` to local `google-font.css`
- `<body>` containing:
  - 1 × `<h1>` — styled with `font-family: 'Lobster', cursive; font-size: 4rem`
  - 2 × `<h2>` — styled with `font-family: 'Lobster', cursive; font-size: 3rem`
  - 5 × `<p>`  — styled with `font-family: 'Raleway', sans-serif; font-size: 1.4rem`

## Baseline observations (before any changes)
| Property | Value |
|---|---|
| h1 text | "Hipster ipsum is the best" |
| h2 count | 2 |
| p count | 5 |
| h1 computed font-family | `Lobster, cursive` |
| p computed font-family | `Raleway, sans-serif` |
| h1 computed font-size | 40px (4rem × 10px base) |
| body computed width | 800px (max-width constraint) |
| Horizontal overflow | None (scrollWidth == clientWidth at 1280px) |

## Assessment
Baseline behavior is **already correct** — no layout defects found. The only issue is the dependency on a live public CDN (`fonts.googleapis.com`), which makes the test non-deterministic. This task contributes:
- A regression test that stubs the external font request with a local fixture
- Evidence that two fresh browser contexts produce identical DOM state
