# R18-T057 Test Results Summary

## Execution Details
- **Test Command**: `node tests/course/r18-t057.mjs`
- **Exit Code**: `0`
- **Node.js**: `v26.13.0`
- **Playwright**: `1.65.1`
- **Browser**: Chromium (headless)
- **Viewport**: Locked at 1280x800

## Checks Completed

1. **Page Entry Point & DOM Structure**:
   - [x] Page served with HTTP 200.
   - [x] Title, `#verse-choose`, label, options, and `<pre>` verified.

2. **Computed CSS Layout**:
   - [x] Body 500px wide, background `#ccc`.
   - [x] Select 350px wide, `<pre>` white background.

3. **Initial Auto-Fetch (Verse 1)**:
   - [x] Page calls `updateDisplay("Verse 1")` on load.
   - [x] `<pre>` fills with Verse 1 stanza text.

4. **Interactive Walkthrough (Verse 2, 3, 4)**:
   - [x] Changing `#verse-choose` triggers `change` event and new `fetch()`.
   - [x] Each verse's content renders correctly in `<pre>`.

5. **Error Handling**:
   - [x] Non-existent verse URL (404) results in readable error message in `<pre>`.

6. **Error Rejection**:
   - [x] Zero page or uncaught JS errors.
   - [x] Deliberate mutation triggers `AssertionError` with non-zero exit.
