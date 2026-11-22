# R18-T057 Artifacts and Evidence

This directory contains test output, baseline, and screenshot evidence for task R18-T057.

## Contents
- `environment.txt`: Runtime tool versions (Node.js, npm, Playwright, OS).
- `test-output.txt`: Raw terminal output from `node tests/course/r18-t057.mjs`.
- `baseline-results.md`: Baseline page inspection and changes made.
- `expected-vs-actual.md`: Full comparison table of walkthrough assertions.
- `results.md`: Verification summary and checklist.
- `walkthrough-initial.png`: Screenshot of page at initial load showing Verse 1.
- `walkthrough-interacted.png`: Screenshot after selecting a different verse.

## Reproduction
```bash
npm test
# or
node tests/course/r18-t057.mjs
```
