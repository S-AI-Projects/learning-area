# R18-T007 Baseline

## Page
javascript/introduction-to-js-1/troubleshooting/number-game-errors.html

## Initial observation
- The page loads normally.
- The input and Submit guess button are visible.
- Clicking Submit guess does not trigger the game.
- Chrome Console reports:
  `Uncaught TypeError: guessSubmit.addeventListener is not a function`

## Source issues identified
- Random number generation uses Math.floor(Math.random()) + 1.
- The lowOrHi selector is missing the class selector dot.
- Both event listener calls use incorrect capitalization.
