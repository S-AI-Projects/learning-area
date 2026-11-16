# Keyboard accessibility testing

Run the regression test from the repository root:

```sh
node tests/course/r18-t021.mjs
```

The test starts a temporary local static server on an available port and uses
a fresh Playwright Chromium context to verify:

- The skip link is the first Tab stop and its focus indicator is visible
  inside the viewport.
- Enter activates the link, updates the fragment, and moves focus to the
  main landmark.
- The original demonstration paragraph remains unchanged and no positive
  `tabindex` values are introduced.
- The page loads without unexpected server, browser, console, or request
  errors.
