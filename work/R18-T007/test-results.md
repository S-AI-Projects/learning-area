# R18-T007 Test Results

## Environment
- Node.js: v26.12.1
- npm: 11.20.0
- Browser automation: Playwright
- Browser: Chromium
- Server: Python HTTP server

## Command
`node tests/course/r18-t007.mjs`

## Actual results
- PASS: page loads and layout is within expected limits
- PASS: high and low guesses display correct feedback
- PASS: ten guesses trigger game over
- PASS: starting a new game resets the controls and results
- PASS: correct guess wins the game
- PASS: no unexpected browser page errors

## Baseline
The page loaded, but Submit guess did not work. Chrome Console reported:
`guessSubmit.addeventListener is not a function`

## Changed behaviour
After correcting the JavaScript errors, the game worked manually and all six automated checks passed.
