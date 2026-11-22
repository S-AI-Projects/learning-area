# Sending Form Data — GET Method Example

A minimal HTML form demonstrating the GET method and how form data is appended to the URL as query parameters.

## What This Example Demonstrates

- Using `method="get"` on an HTML form
- How the browser serialises form field values into the URL query string (`?say=Hi&to=Mom`)
- Labelling form controls correctly with `<label for="...">` for accessibility

## Source Anchors

| Anchor | Element | Role |
|--------|---------|------|
| `#say` | `<input name="say" id="say" value="Hi">` | The "greeting" text input; its value becomes the `say=` query parameter |

## Motion and Focus Preferences

This page contains **no animations or transitions** — it is a purely static form layout. Under `prefers-reduced-motion: reduce` emulation the page is unaffected because there is nothing to suppress.

Keyboard focus on `#say` relies on the browser's default UA stylesheet focus indicator (`:focus { outline: auto }`) which is visible at all tested viewport widths.

## Running the Example

Open `get-method.html` via any local HTTP server:

```bash
# From the repo root:
npx serve .
# Then navigate to:
# http://localhost:3000/html/forms/sending-form-data/get-method.html
```

## Running the Automated Test

```bash
# From the repo root:
node tests/course/r18-t059.mjs
```

The test starts a local HTTP server automatically, runs Playwright in headless Chromium at both desktop (1280px) and mobile (375px) viewport widths, emulates `prefers-reduced-motion: reduce`, and exits with code 0 on success or non-zero on failure.

## Files

| File | Description |
|------|-------------|
| `get-method.html` | Static GET-method form example |
| `post-method.html` | POST-method companion example |
| `php-example.html` | PHP server-side processing example |

## Related MDN Article

[Sending form data](https://developer.mozilla.org/en-US/docs/Learn/Forms/Sending_and_retrieving_form_data)
