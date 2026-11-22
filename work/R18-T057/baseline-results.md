# Baseline Analysis: Fetching Data (R18-T057)

## Target Page
`javascript/apis/fetching-data/fetch-start.html`

## Source Anchor
`#verse-choose` — the dropdown `<select>` element controlling which poem verse is fetched.

## Baseline State Before Changes

1. **Original HTML (`fetch-start.html`)**:
   - Contained `<select id="verse-choose">` with options Verse 1–4.
   - Contained a `<pre>` element for displaying poem text.
   - The embedded `<script>` block was empty — no event listeners or fetch logic.
   - Page loaded with no visible poem text; the `<pre>` block was empty.

2. **Teaching Purpose**:
   - The file is the "starting point" for the MDN fetch API walkthrough tutorial.
   - Students are expected to progressively add `fetch()` logic to populate the `<pre>` element when the `#verse-choose` dropdown changes.
   - The "finish" version (`fetch-finish.html`) demonstrates the completed implementation.

## Changes Made
- Completed `fetch-start.html` with the `fetch()` implementation from the MDN tutorial:
  - Added `verseChoose.addEventListener("change", ...)` event listener.
  - Added `updateDisplay(verse)` function that constructs the `.txt` URL and fetches using `fetch()`.
  - Added graceful error display in `.catch()`.
  - Exposed `window.updateDisplay = updateDisplay` for testable error path simulation.
  - Initialized page by calling `updateDisplay("Verse 1")` and setting `verseChoose.value = "Verse 1"`.

## Walkthrough Summary

| Step | Action | Expected Result |
|:---|:---|:---|
| Initial load | Navigate to page | Verse 1 auto-fetched and rendered in `<pre>` |
| Verse 2 | Change `#verse-choose` to `Verse 2` | `fetch("verse2.txt")` fires, `<pre>` updates |
| Verse 3 | Change `#verse-choose` to `Verse 3` | `fetch("verse3.txt")` fires, `<pre>` updates |
| Verse 4 | Change `#verse-choose` to `Verse 4` | `fetch("verse4.txt")` fires, `<pre>` updates |
| Error | Trigger `updateDisplay("Verse 99")` | `Could not fetch verse: HTTP error: 404` shown |
