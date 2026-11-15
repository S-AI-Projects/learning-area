# Practical Positioning Examples

This directory demonstrates CSS positioning techniques, including fixed positioning and tabbed information widgets.

## Example: Fixed Info Box

File: `fixed-info-box.html`

This example demonstrates `position: fixed` layout. The information widget (`.info-box`) remains anchored at the top-left corner of the viewport while the surrounding content (`.fake-content`) scrolls vertically. The widget implements a keyboard-accessible tablist and tabpanel interface based on the ARIA Authoring Practices Guide (APG).

### Keyboard Navigation

- **Tab**: Moves focus to the active tab (`#tab-1`). Pressing `Tab` again moves focus into the active tabpanel (`#tabpanel-1`), enabling keyboard users to read or interact with the content.
- **Shift + Tab**: Navigates backwards from the active tabpanel back to the active tab.
- **Left / Right Arrow**: Moves focus between tabs (`Tab 1`, `Tab 2`, `Tab 3`) with cyclical wrapping.
- **Home / End**: Moves focus directly to the first (`Tab 1`) or last (`Tab 3`) tab.
- **Enter / Space**: Activates the focused tab, displaying its corresponding tabpanel and hiding other panels.

---

## Automated Regression Testing

The test suite verifies keyboard traversal, visible focus, ARIA attributes, tab activation, and computed CSS fixed positioning.

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
node tests/course/r18-t051.mjs
```

Or via npm:

```bash
npm test
```

The test launches an internal HTTP server, loads the page in Chromium (headless), executes all keyboard navigation checks and assertions, and cleans up all processes on exit.
