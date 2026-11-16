# R18-T007: Number Guessing Game Walkthrough

## Page entry point
`javascript/introduction-to-js-1/troubleshooting/number-game-errors.html`

## Setup
From the repository root, run:

`python3 -m http.server 8000`

Open:
`http://localhost:8000/javascript/introduction-to-js-1/troubleshooting/number-game-errors.html`

## Original behaviour
The page loaded, but clicking Submit guess did not work. Chrome Console reported:
`guessSubmit.addeventListener is not a function`

## Fixes
- Corrected random number generation to select a number from 1 to 100.
- Corrected the lowOrHi class selector.
- Corrected both addEventListener method names.

## Tested interaction
The automated test uses 50 as the fixed answer:
1. Guess 75: expected too high.
2. Guess 25: expected too low.
3. Make eight more incorrect guesses: expected game over after ten guesses.
4. Click Start new game: expected cleared results and enabled controls.
5. Guess 50: expected congratulations.

## Automated test
From the repository root, run:

`node tests/course/r18-t007.mjs`
