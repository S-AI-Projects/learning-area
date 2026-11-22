# Custom Radio Buttons — Repeat Initialization & DOM Lifecycle

This directory contains the custom radio styles example demonstrating custom appearance, pseudo-element indicators, and smooth state transitions.

## Repeat Initialization & Interaction Guarantees

- **Singular DOM Representation**:
  - The form (`<form>`) and its controls (`<input type="radio">`) remain strictly singular on repeat page loads and interactions.
  - Radio button groups retain mutual exclusivity across repeated selections.
- **Isolated Lifecycle & Style Harness**:
  - For static demos, repeat initialization and theme/style toggles are verified via an isolated harness.
  - Calling initialization multiple times resets prior handlers and timers without duplicating DOM nodes or event listeners.
  - Each user interaction produces exactly one state update.
  - Complete cleanup removes all test-generated DOM nodes, intervals, and listeners, leaving zero persistent background artifacts.

---

## Automated Regression Testing

The test suite validates:
1. Baseline repeated initialization across multiple loads without duplicate nodes or styles.
2. Repeated user check/uncheck interactions maintaining mutual exclusivity.
3. Isolated harness lifecycle verifying repeat initialization, singular toggle updates, and clean disposal of timers/listeners.
4. Absence of unexpected browser or console errors.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Playwright](https://playwright.dev/) with Chromium installed

### Setup

From the repository root:

```bash
npm install
npx playwright install chromium
```

### Run the Test

From the repository root:

```bash
node tests/course/r18-t054.mjs
```

Or via npm:

```bash
npm test
```
