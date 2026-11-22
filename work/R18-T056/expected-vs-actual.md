# Expected vs Actual Results: R18-T056

## Overview
Automated regression test `tests/course/r18-t056.mjs` was executed across two distinct browser contexts:
1. **Pass 1: Feature-Present Path (Native Support)**
2. **Pass 2: Feature-Absent Path (Stubbed Unsupported Feature via `CSS.supports`)**

## Comparison Table

| Scenario / Check | Assertion Target | Expected Value | Actual Value | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Pass 1: Feature-Present** | HTTP Status | 200 OK | 200 OK | PASS |
| Pass 1 | `#main-content` | Visible in DOM | Visible in DOM | PASS |
| Pass 1 | `#table-fallback[hidden]` | `true` (hidden) | `true` (hidden) | PASS |
| Pass 1 | `#template-table` headers | 2 `th` elements | 2 `th` elements | PASS |
| Pass 1 | `#template-table` cells | 4 `td` elements | 4 `td` elements | PASS |
| Pass 1 | Computed `border-collapse` | `collapse` | `collapse` | PASS |
| Pass 1 | Header background color | `rgb(235, 235, 235)` | `rgb(235, 235, 235)` | PASS |
| Pass 1 | Odd row cell background | `rgb(220, 220, 220)` | `rgb(220, 220, 220)` | PASS |
| Pass 1 | Even row cell background | `rgb(250, 250, 250)` | `rgb(250, 250, 250)` | PASS |
| Pass 1 | Console & page errors | `[]` | `[]` | PASS |
| **Pass 2: Feature-Absent** | HTTP Status | 200 OK | 200 OK | PASS |
| Pass 2 | `CSS.supports` stub | Returns `false` for `border-collapse` | Returns `false` | PASS |
| Pass 2 | `#table-fallback[hidden]` | `false` (visible) | `false` (visible) | PASS |
| Pass 2 | Fallback message text | Contains guidance regarding unsupported features | Matches expected text | PASS |
| Pass 2 | Fallback element role | `role="status"` | `role="status"` | PASS |
| Pass 2 | `#template-table` in fallback | Remains in DOM & readable | Maintained in DOM | PASS |
| Pass 2 | Console & page errors | `[]` | `[]` | PASS |
| **Rejection Check** | Deliberate mutation | Throws `AssertionError` | Throws `AssertionError` | PASS |
