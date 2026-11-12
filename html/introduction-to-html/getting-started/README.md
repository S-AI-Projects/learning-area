## Keyboard accessibility testing

Run the regression test from the repository root:

    node tests/course/r18-t021.mjs

The test uses Playwright and Chromium to verify:

- Tab navigation to the skip link.
- Visible keyboard focus.
- Enter-key activation.
- Focus movement to main content.
- Absence of positive tabindex values.
- Absence of unexpected browser errors.
