# R18-T055 Artifacts and Evidence

This directory contains test execution records, baseline observations, and visual evidence for task R18-T055.

## Contents
- `environment.txt`: Runtime tool versions (Node.js, npm, Playwright, OS).
- `test-output.txt`: Raw terminal output from running `node tests/course/r18-t055.mjs`.
- `baseline-results.md`: Detailed baseline inspection of the DOM starter example.
- `expected-vs-actual.md`: Side-by-side comparison table of expected vs actual metrics across both contexts.
- `results.md`: Verification summary and criteria status.
- `context1-1280x800.png`: Visual snapshot rendered in Context 1.
- `context2-1280x800.png`: Visual snapshot rendered in Context 2.

## Reproduction
To re-run the verification:
```bash
npm test
# or
node tests/course/r18-t055.mjs
```
