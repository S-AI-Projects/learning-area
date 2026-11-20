# R18-T020 baseline

Before the fix, Reset wrote source into a live script element and then evaluated
the same source. On the first reset, its top-level `const` declarations caused
a `SyntaxError`, leaving the preview cleared. The element is now a `text/plain`
data block, so only the explicit evaluation executes the user code.

The check routes JSON to a local fixture, then compares the preview and editor
before and after Reset. A second run changes only the served `playable.js`
response so Reset listens for `mouseover` instead of `click`; the same reset
assertion detects the mutated state. No mutation is written to application
files.
