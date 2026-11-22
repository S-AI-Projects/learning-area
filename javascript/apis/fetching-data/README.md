# Fetching Data: Walkthrough & Regression Test

This directory demonstrates loading text files asynchronously using the browser `fetch()` API:

- `fetch-start.html`: Working interactive page demonstrating asynchronous data fetching from text files (`verse1.txt` - `verse4.txt`) based on user selection in the `#verse-choose` dropdown.
- `fetch-finish.html`: Completed reference implementation from MDN learning modules.
- `can-store/` & `can-store-xhr/`: Demonstrations of product catalog filtering using `fetch()` and legacy `XMLHttpRequest`.

## Page Entry Point & Local Setup

Because the Fetch API requires HTTP(S) protocol to avoid browser CORS/file-protocol blocks, run a local web server:

```bash
# Start local HTTP server from the repository root:
python3 -m http.server 8000
```

Open in your browser:
```
http://localhost:8000/javascript/apis/fetching-data/fetch-start.html
```

## Interactive Walkthrough

1. **Initial Entry Point**:
   - The page loads with centered 500px layout and a `<select id="verse-choose">` dropdown.
   - Initial selection defaults to **Verse 1**.
   - `fetch("verse1.txt")` executes automatically on load, rendering the first stanza of Edgar Allan Poe's *The Conqueror Worm* inside the `<pre>` container.

2. **User Interaction**:
   - Change the dropdown selection to **Verse 2**.
   - A `change` event fires on `#verse-choose`, triggering an asynchronous GET request to `verse2.txt`.
   - The `<pre>` container dynamically updates to display the second stanza (*"That motley drama- oh, be sure..."*).
   - Switching to **Verse 3** or **Verse 4** similarly fetches and renders the corresponding stanza.

3. **Error Handling**:
   - If an invalid verse or missing network resource is requested, the `.catch()` block catches the HTTP error and displays an informative error message: `Could not fetch verse: HTTP error: <status>`.

## Automated Browser Regression Check

Execute the Playwright automated walkthrough test from the repository root:

```bash
node tests/course/r18-t057.mjs
```

The test validates:
- Page status 200 and absence of page/console errors.
- Rendered DOM structure and computed CSS layout of the `#verse-choose` selector and `<pre>` container.
- Complete asynchronous user interaction across dropdown changes and content updates.
- Rejection on assertion failure.

