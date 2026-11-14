# Keyboard Accessibility Check

This example contains a comments section that can be operated using a keyboard.

## Run the automated test

### Prerequisites
- Node.js
- Playwright and Chromium

### Setup

From the repository root, run:

```bash
cd tests/course
npm install
npx playwright install chromium
cd ../..
```

### Run the test

From the repository root:

```bash
node tests/course/r18-t001.mjs
```

The test starts its own local server, opens the page in Chromium, checks keyboard navigation and form submission, and closes the browser and server when finished.