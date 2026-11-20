# Course browser checks

These checks run against the real example pages served from this checkout. They
use Node.js and Playwright's Chromium browser; each check starts an ephemeral
local server, creates fresh browser contexts and closes both resources when it
finishes.

From the repository root, install the dependency and its browser once:

```sh
npm ci
npx playwright install chromium
```

Then run a task check directly, for example:

```sh
node tests/course/r18-t017.mjs
```

The checks write inputs, expected and actual observations, and tool versions to
the matching `work/R18-Txxx/` directory. Assertion failures produce a non-zero
exit status.
