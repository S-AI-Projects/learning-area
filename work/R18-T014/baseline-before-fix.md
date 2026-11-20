# R18-T014 baseline

Before the fix, loading `accessibility/assessment-finished/main.js` a second
time raised an uncaught `SyntaxError`: `Identifier 'showHideBtn' has already
been declared`. The check rejected that page error, so repeated initialization
did not reach the comment toggle or form assertions.

After the fix, the script is scoped in an IIFE. A second load completes without
page errors; toggles still show and hide the comments once, and one form submit
adds exactly one comment node and clears both fields.

The initial failure was observed with Node v26.13.1, Playwright v1.65.1 and
Chromium 159.0.8154.6. The passing run and its actual DOM observations are in
`evidence.json`.
