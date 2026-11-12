# Custom radio button styles

This example demonstrates styling native radio buttons with CSS while preserving their native form behavior.

## Run the responsive regression test

From the repository root:

```bash
npm install
npx playwright install chromium
npm run test:r18-t050
```

The test checks the example at 360 × 800 and 1280 × 800 pixels.

It verifies content order, radio dimensions, horizontal overflow, control clipping, mouse and keyboard selection, computed indicator styling, and unexpected browser errors.

A deliberate mobile overflow mutation confirms that the regression test detects layout failures.

Screenshots and results are saved in work/R18-T050/.
