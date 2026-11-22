# Basic HTML table template and styling

This directory contains the starter template and minimal stylesheet for the MDN HTML table basics learning module:

- `blank-template.html`: HTML document providing the semantic markup container and sample template table within the main rendered content region.
- `minimal-table.css`: Base stylesheet providing table styling, zebra striping, cascading fallbacks for modern space-separated `rgb()` colors, and `@supports` feature queries.
- `table-feature-check.js`: Progressive feature detection verifying support for advanced CSS table properties and revealing explicit fallback guidance when unsupported.

## Automated regression check

Run the Playwright regression test from the repository root:

```bash
node tests/course/r18-t056.mjs
```

### What the test verifies

1. **Local test server**: Serves `blank-template.html`, `minimal-table.css`, and `table-feature-check.js` with proper MIME types.
2. **Feature-present path (native support)**:
   - Verifies the main rendered content region (`#main-content`) is present and visible.
   - Verifies table elements (`#template-table`, `th`, `td`) render with `border-collapse: collapse`.
   - Confirms computed colors, borders, and zebra striping.
   - Confirms the fallback element (`#table-fallback`) remains hidden.
3. **Feature-absent path (stubbed unsupported)**:
   - Uses an explicit `CSS.supports` stub to simulate an unsupported browser environment.
   - Confirms that the unsupported path produces a visible, accessible fallback notice (`role="status"`).
   - Confirms that the underlying table markup remains intact and readable without error.
4. **Error rejection and mutation handling**:
   - Asserts zero page errors, console errors, or network leaks.
   - Confirms that deliberate assertion mutations cause non-zero exit codes.
