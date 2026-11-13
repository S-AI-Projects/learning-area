# YouTube video search example

## Page and setup

Open [`index.html`](./index.html) to view the example. It loads the YouTube Data
API client and IFrame Player API from Google, then runs [`script.js`](./script.js)
and applies [`youtube.css`](./youtube.css). A Google API key is required for a
live search; add your key where indicated in `script.js`.

From the repository root, install the browser-check dependency and Chromium:

```sh
npm ci --prefix tests/course
npm exec --prefix tests/course -- playwright install chromium
```

Run the check with:

```sh
node tests/course/r18-t027.mjs
```

The check serves this static example on an ephemeral localhost port, waits for
the page to respond, and closes the server and browser when it finishes. Its
Google API and player responses are stubbed, so it needs no API key or external
network access.

## Walkthrough

In the left column, `#search` is the required search-term input labeled
“Enter a search term (required):”. Submitting it calls
`gapi.client.youtube.search.list` with `part: "snippet"`, `maxResults: 10`, and
the entered query. The response clears the existing results and creates a
YouTube player for each returned video in the right column.

The browser check confirms that an empty submission makes no API request, then
submits “space flight” and verifies the request parameters and two rendered
480×360 player frames. It also checks that another query replaces the previous
results and that the centered 80%-width wrapper has two equal columns. In a
1200×900 Chromium viewport, the wrapper is 947.19px wide and each column is
473.59px wide. The test substitutes deterministic API/player responses; it
does not validate live credentials or video availability.
