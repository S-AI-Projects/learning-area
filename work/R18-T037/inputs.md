# R18-T037 Inputs

## Page Under Test
`html/forms/sending-form-data/get-method.html`

## Source Anchors
`#say` (`<input name="say" id="say" value="Hi" />`)

## Feature Demonstrated
HTML GET form data transmission:
- Label-to-input association via `for` and `id` attributes.
- Two-column CSS layout via `display: inline-block` labels and `float: right` inputs.
- Form serialization according to the HTTP GET standard: inputs with `name` attributes are encoded into query parameters (`?key1=val1&key2=val2`).

## Execution Inputs & Configuration
| Parameter | Value |
|---|---|
| Test runner | Node.js Playwright (`tests/course/r18-t037.mjs`) |
| Local server | Node.js HTTP server (`http://127.0.0.1:<PORT>`) |
| Browser | Chromium (headless) |
| Viewport | 1280 × 800 |
| Network mode | Fully offline; `http://example.com/**` intercepted via `page.route()` |

## Test Scenarios & Interactions
1. **Pass 1: Rendered DOM & Computed Layout**
   - Assert presence of `<form>`, `#say`, `<label for="say">`, `<input name="to">`, `<label for="to">`, `<button>`.
   - Verify initial values: `say="Hi"`, `to="Mom"`.
   - Assert computed CSS styles (`form` width: 420px, `label` display: inline-block, width: 240px, text-align: right, `input`/`button` float: right).
   - Assert no viewport horizontal overflow.
2. **Pass 2: Label Focus Transfer Interaction**
   - Click `<label for="say">`.
   - Assert focus transfers to `#say` (`document.activeElement.id === 'say'`).
3. **Pass 3: Baseline Form Submission (Default Values)**
   - Click `<button>Send my greetings</button>`.
   - Intercept request and assert query string: `?say=Hi&to=Mom`.
4. **Pass 4: Complete Interaction Walkthrough**
   - Focus `#say` and change value to `"Hello, World!"`.
   - Change `[name="to"]` to `"Alice"`.
   - Click `<button>Send my greetings</button>`.
   - Intercept request and assert query string: `?say=Hello%2C+World%21&to=Alice`.
   - Assert zero uncaught page errors.
