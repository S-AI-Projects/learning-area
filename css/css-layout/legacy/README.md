# CSS Legacy Layout — Skeleton Grid Example

A pure-CSS float-grid layout demo using **Skeleton V2.0.4** (`skeleton.css`), demonstrating how legacy float-based grid systems work before CSS Grid and Flexbox were widely available.

## What This Example Demonstrates

- Using the Skeleton CSS 12-column float-grid
- Class naming: `.one.column`, `.six.columns`, `.three.columns`, `.two.columns`, etc.
- How column widths are expressed as percentages of their containing row
- The clearfix pattern (`.row:after { content: ""; display: table; clear: both; }`)
- Responsive breakpoints: columns stack on `< 550px`, expand at `≥ 550px`

## Source Anchors

| Region | Description |
|--------|-------------|
| Main rendered content region | The `.container > .row` grid rows with their column cells |

## Grid Column Widths (at ≥ 550px)

| Class | Width |
|-------|-------|
| `.one.column` / `.one.columns` | 4.67% |
| `.two.columns` | 13.33% |
| `.three.columns` | 22% |
| `.six.columns` | 48% |
| `.twelve.columns` | 100% |

All columns have `float: left` and `margin-left: 4%` (except the first child).

## Running the Example

Open `html-skeleton-finished.html` via a local HTTP server:

```bash
# From the repo root:
npx serve .
# Then navigate to:
# http://localhost:3000/css/css-layout/legacy/html-skeleton-finished.html
```

## Running the Automated Test

```bash
# From the repo root:
node tests/course/r18-t060.mjs
```

The test starts a local HTTP server automatically, runs Playwright in headless Chromium at desktop width (1200px), verifies grid column widths and float behavior, runs a **deliberate-break fixture** to confirm the assertions detect a layout regression, then restores the page. Exits with code 0 on success, non-zero on failure.

## Files

| File | Description |
|------|-------------|
| `html-skeleton-finished.html` | The completed Skeleton grid demo |
| `skeleton.css` | Skeleton V2.0.4 CSS framework |
| `normalize.css` | CSS reset / normalize |

## Related MDN Article

[Legacy layout methods](https://developer.mozilla.org/en-US/docs/Learn/CSS/CSS_layout/Legacy_Layout_Methods)
