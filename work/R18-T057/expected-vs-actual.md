# Expected vs Actual Results: R18-T057

## Overview
Executed `tests/course/r18-t057.mjs` against a local HTTP server serving `fetch-start.html` with locked viewport 1280×800.

## Comparison Table

| Step / Check | Expected | Actual | Status |
| :--- | :--- | :--- | :--- |
| HTTP Status | 200 OK | 200 OK | PASS |
| Page title | `Fetch starting point` | `Fetch starting point` | PASS |
| `#verse-choose` exists | 1 element | 1 element | PASS |
| Dropdown options | Verse 1, 2, 3, 4 | Verse 1, 2, 3, 4 | PASS |
| Label `for="#verse-choose"` | `Choose a verse` | `Choose a verse` | PASS |
| Body width (computed) | 500px | 500px | PASS |
| Body background color | `rgb(204, 204, 204)` | `rgb(204, 204, 204)` | PASS |
| `#verse-choose` width | 350px | 350px | PASS |
| `<pre>` background | `rgb(255, 255, 255)` | `rgb(255, 255, 255)` | PASS |
| Initial `<pre>` content | Includes `Lo! 'tis a gala night` | Includes expected text | PASS |
| Initial `#verse-choose` value | `Verse 1` | `Verse 1` | PASS |
| Verse 2 interaction | Fetches & shows verse2.txt | `That motley drama- oh, be sure` | PASS |
| Verse 3 interaction | Fetches & shows verse3.txt | `A crawling shape intrude!` | PASS |
| Verse 4 interaction | Fetches & shows verse4.txt | Stanza text > 50 chars | PASS |
| Error handling (Verse 99) | Shows 404 error message | `Could not fetch verse: HTTP error: 404` | PASS |
| Page errors | `[]` | `[]` | PASS |
| Console errors | `[]` (excluding expected 404 log) | `[]` | PASS |
| Mutation rejection | Throws `AssertionError` | Throws `AssertionError` | PASS |
