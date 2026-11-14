
# R18-T001: Verify Keyboard Use

## 1. Task

Verify that the comments section can be accessed and operated using a keyboard, with visible focus and correctly labelled form controls.

## 2. Baseline observations

Before the changes:

- The Show comments control was a `<div>` and could not be reached using Tab.
- Enter and Space could not activate the control.
- Mouse clicking worked.
- The name and comment inputs did not have associated labels.
- The comment form could be used after opening the comments section.

## 3. Changes made

### index.html

- Replaced the Show comments `<div>` with a native `<button>`.
- Added `aria-expanded` and `aria-controls` attributes.
- Added an ID to the comments container and used the `hidden` attribute for its initial state.
- Added associated `<label>` elements for the name and comment inputs.

### main.js

- Updated the comments toggle to use the button's `aria-expanded` state.
- Updated the button text when comments are opened or closed.
- Used the `hidden` property to show and hide the comments section.
- Retained the existing comment submission behavior.

### Automated test

- Added `tests/course/r18-t001.mjs`.
- The test starts a local HTTP server and launches a fresh Chromium browser context.
- The server and browser are closed after the test.

## 4. Manual testing

| Check | Result |
|---|---|
| Tab reaches Show comments | PASS |
| Enter opens comments | PASS |
| Space closes comments | PASS |
| Visible focus indicator | PASS |
| Labels associated with inputs | PASS |
| Comment submission | PASS |
| Input fields clear after submission | PASS |
| Page does not reload | PASS |

## 5. Automated testing

Command:

`node tests/course/r18-t001.mjs`

All checks passed:

1. Comments start hidden.
2. No positive tabindex values.
3. Tab reaches Show comments and focus is visible.
4. Enter opens comments.
5. Space closes comments.
6. Tab reaches name, comment, and submit controls in order.
7. Both form fields have associated labels.
8. Keyboard submission adds the comment and clears both fields.
9. No unexpected page errors.

The test passed when run from both the repository root and `tests/course`.
## 6. Test inputs and expected vs actual results

### Automated form test

**Input values:**
- Name: `Playwright Test`
- Comment: `Testing keyboard comment submission.`

| Expected result | Actual result |
|---|---|
| A new comment appears with the entered name. | Passed. |
| The comment text matches the entered text. | Passed. |
| Both input fields become empty. | Passed. |
| The page does not reload. | Passed. |

### Manual form test

**Input values:**
- Name: `Gitesh Test`
- Comment: `Testing my first accessible comment form.`

The comment appeared below the existing comment, both fields cleared, and the page did not reload.
## 7. Tool versions

| Tool | Version |
|---|---|
| macOS | 26.7.2 |
| Node.js | 26.12.1 |
| Git | 2.55.0 |
| Playwright | 1.65.0 |
| Chromium | 158.0.8127.18 |
| Chromium revision | 1254 |

## 8. Dependency and whitespace checks

- `npm install`: completed successfully.
- Dependency audit: 0 vulnerabilities.
- `git diff --check`: clean.
- `node_modules/` added to `.gitignore`.

## 9. Final status

All nine automated checks passed. Manual keyboard and form checks also passed.

Commit: Pending  
Pull request: Pending
