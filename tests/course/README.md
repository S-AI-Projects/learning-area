# Course browser checks

These checks run against the real example pages served from this repository.
They use Node.js and Playwright's Chromium browser; each check starts an ephemeral
local server, creates fresh browser contexts, runs strict assertions, and cleans
up both server and browser resources on completion.

## Setup

From the repository root, install dependencies and download the Chromium browser:

```sh
npm install
npx playwright install chromium
```

## Running the Check

To run the check for task R18-T032:

```sh
node tests/course/r18-t032.mjs
```

Or via npm:

```sh
npm test
```

The check writes inputs, expected versus actual observations, tool versions, and
screenshots to `work/R18-T032/`. Any assertion failure produces a non-zero exit code.
