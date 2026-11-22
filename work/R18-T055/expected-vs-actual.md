# Expected vs Actual Results: R18-T055

## Overview
Automated regression test `tests/course/r18-t055.mjs` executed across two independent, fresh browser contexts with locked viewport (1280x800) and strict offline request interception.

## Comparison Table

| Property / Assertion | Expected Baseline | Actual Context 1 | Actual Context 2 | Status |
| :--- | :--- | :--- | :--- | :--- |
| HTTP Status | 200 OK | 200 OK | 200 OK | PASS |
| Document Title | `Simple DOM example` | `Simple DOM example` | `Simple DOM example` | PASS |
| Document Language | `en-US` | `en-US` | `en-US` | PASS |
| Meta Charset | `utf-8` | `utf-8` | `utf-8` | PASS |
| Meta Viewport | `width=device-width, initial-scale=1.0` | `width=device-width, initial-scale=1.0` | `width=device-width, initial-scale=1.0` | PASS |
| Section Child Elements | 2 (`img`, `p`) | 2 | 2 | PASS |
| `img` `src` attribute | `dinosaur.png` | `dinosaur.png` | `dinosaur.png` | PASS |
| `img` `alt` attribute | Full T-Rex descriptive text | Full T-Rex descriptive text | Full T-Rex descriptive text | PASS |
| `img` naturalWidth | 240 px | 240 px | 240 px | PASS |
| `img` naturalHeight | 210 px | 210 px | 210 px | PASS |
| `img` complete | `true` | `true` | `true` | PASS |
| `img` bounding box | `{ width: 240, height: 210 }` | `{ width: 240, height: 210 }` | `{ width: 240, height: 210 }` | PASS |
| `a` `href` destination | `https://www.mozilla.org/` | `https://www.mozilla.org/` | `https://www.mozilla.org/` | PASS |
| `a` text content | `Mozilla homepage` | `Mozilla homepage` | `Mozilla homepage` | PASS |
| `a` parent tag | `p` | `p` | `p` | PASS |
| `a` bounding width | > 0 px | 120 px | 120 px | PASS |
| `a` bounding height | > 0 px | 18 px | 18 px | PASS |
| Paragraph text | `"Here we will add a link to the Mozilla homepage"` | `"Here we will add a link to the Mozilla homepage"` | `"Here we will add a link to the Mozilla homepage"` | PASS |
| Scripts count | 0 | 0 | 0 | PASS |
| Stylesheets count | 0 | 0 | 0 | PASS |
| External requests | 0 (all external blocked) | 0 | 0 | PASS |
| Page / console errors | 0 | 0 | 0 | PASS |
| Cross-context diff | 0 differences | Context 1 == Context 2 | Context 1 == Context 2 | PASS |
| Mutation rejection | AssertionError thrown on mutation | AssertionError thrown | AssertionError thrown | PASS |
