# Audio transcript UI

## Run and test

From the repository root, install the browser-check dependency and Chromium, then run:

```sh
cd tests/course
npm ci
npx playwright install chromium
cd ../..
node tests/course/r18-t030.mjs
```

The check starts and cleans up a loopback Python static server. It verifies the custom audio controls and transcript's collapsed/expanded layout in fresh browser contexts, then serves a temporary copy of `main.js` with the transcript click binding removed and requires the transcript assertion to fail. Audio playback state is stubbed for deterministic interaction checks; this does not represent a real-device playback test. Inputs and results are saved under `work/R18-T030/`.
