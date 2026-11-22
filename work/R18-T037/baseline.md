# R18-T037 Baseline

## Page
`html/forms/sending-form-data/get-method.html`

## Entry Point & Setup
- **Page entry point**: `http://127.0.0.1:<PORT>/html/forms/sending-form-data/get-method.html`
- **Setup command**: `npm install && node tests/course/r18-t037.mjs`

## Purpose
Demonstrates how HTML forms construct and dispatch HTTP GET requests with URL query string parameters (`?key=value&...`) upon submission, as well as label association and form control styling using CSS floats.

## Structure & Linked Assets
- **External scripts / styles**: None (pure native HTML form and internal CSS).
- **Internal CSS styles**:
  - `form`: `width: 420px;`
  - `div`: `margin-bottom: 20px;`
  - `label`: `display: inline-block; width: 240px; text-align: right; padding-right: 10px;`
  - `button, input`: `float: right;`
- **Form elements**:
  - `<form action="http://example.com" method="get">`
  - Control 1: `<label for="say">` + `<input name="say" id="say" value="Hi" />`
  - Control 2: `<label for="to">` + `<input name="to" value="Mom" />`
  - Submit control: `<button>Send my greetings</button>`

## Source Anchors
| Anchor | Element | Role & Purpose |
|---|---|---|
| `#say` | `<input id="say" name="say" value="Hi">` | Target input control representing the greeting text. Associated with `<label for="say">` and serialized as `say=<value>` in the GET query string. |

## Baseline Observations
| Property | Expected / Specified | Actual Value | Status |
|---|---|---|---|
| Page entry point | `/html/forms/sending-form-data/get-method.html` | `/html/forms/sending-form-data/get-method.html` | Matched |
| Form action | `http://example.com` | `http://example.com` | Matched |
| Form method | `get` | `get` | Matched |
| Form computed width | `420px` | `420px` | Matched |
| `#say` element tag | `INPUT` | `INPUT` | Matched |
| `#say` name attribute | `say` | `say` | Matched |
| `#say` initial value | `Hi` | `Hi` | Matched |
| `label[for="say"]` text | `What greeting do you want to say?` | `What greeting do you want to say?` | Matched |
| `input[name="to"]` initial value | `Mom` | `Mom` | Matched |
| `button` text | `Send my greetings` | `Send my greetings` | Matched |
| Label computed display | `inline-block` | `inline-block` | Matched |
| Label computed width | `240px` | `240px` | Matched |
| Label text-align | `right` | `right` | Matched |
| Input & button float | `right` | `right` | Matched |
| Label click focus | Focus shifts to `#say` | `document.activeElement.id === 'say'` | Matched |
| Baseline GET submission URL | `http://example.com/?say=Hi&to=Mom` | `http://example.com/?say=Hi&to=Mom` | Matched |
| Page errors | 0 | 0 | Matched |

## Assessment
Baseline behavior is **already correct**. The page faithfully exemplifies the MDN teaching specification for GET form data submission, label binding, and CSS floating layout. In accordance with Step 2, no manufactured defects or unnecessary HTML changes were introduced; a strict regression test and evidence suite are contributed.
