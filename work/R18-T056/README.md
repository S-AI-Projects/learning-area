# R18-T056 Artifacts and Evidence

This directory contains test output, baseline observations, and screenshot evidence for task R18-T056.

## Contents
- `environment.txt`: Runtime environment details (Node.js, npm, Playwright, OS).
- `test-output.txt`: Raw console output from running `node tests/course/r18-t056.mjs`.
- `baseline-results.md`: Baseline inspection and analysis.
- `expected-vs-actual.md`: Side-by-side comparison table of expected vs actual metrics for both feature paths.
- `results.md`: Verification summary and checklist.
- `feature-present.png`: Screenshot of the page in the supported browser path.
- `feature-absent.png`: Screenshot of the page with the fallback notice in the unsupported browser path.

## Reproduction
To re-run the verification:
```bash
npm test
# or
node tests/course/r18-t056.mjs
```
