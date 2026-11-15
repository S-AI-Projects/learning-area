# Accessibility Assessment — Responsive Layout & Controls

This example contains the wildlife assessment page showcasing accessible web layouts, responsive styles, media integration, and an interactive comment form.

## Responsive Design

The layout adapts cleanly between mobile and desktop viewports:

- **Mobile Viewport (360×800)**:
  - Header and navigation adapt to vertical flow.
  - Main content article stacks above the secondary related content, maintaining natural reading order.
  - Media elements (images, audio) scale to fit container width without causing horizontal overflow.
  - Multi-column data table is housed in an intentionally scrollable container (`.table-container`) with `role="region"`, `aria-label="Bear types and facts"`, and `tabindex="0"`.
  - Form inputs (`#name` and `#comment`) expand to full width and remain unclipped within viewport boundaries.
- **Desktop Viewport (1280×800)**:
  - Preserves two-column desktop layout with sidebar navigation, side-by-side article and secondary links, and full-size audio and media displays.

---

## Automated Regression Testing

The test suite validates responsive behavior at 360×800 and 1280×800 viewports, verifying absence of unintended horizontal overflow, unclipped source controls (`#name`, `#comment`), content order, intentional scroll regions, and comment submission functionality.

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
node tests/course/r18-t052.mjs
```

Or via npm:

```bash
npm test
```

The test launches a local static HTTP server, runs Chromium in headless mode across both target viewports, verifies all layout and interaction assertions, executes an overflow mutation check, and cleans up all processes on exit.
