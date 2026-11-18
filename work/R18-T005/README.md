
# R18-T005: Browser Test Evidence

## Baseline

Target: `html/forms/your-first-HTML-form/first-form.html`

The original page is a static HTML form containing:
- `#name`: text input (`user_name`)
- `#mail`: email input (`user_mail`)
- `#msg`: textarea (`user_message`)
- A POST form action: `/my-handling-form-page`

No linked scripts, external requests, clock dependencies, or random values were present. The original example HTML was left unchanged.

## Test inputs

- Name: `Test User`
- Email: `test@example.com`
- Message: `Deterministic form test`
- Viewport: 1280 × 800
- Device scale factor: 1
- Font fixture: Arial
- Browser contexts: 2 fresh contexts

## Expected and actual results

| Check | Expected | Actual |
|---|---|---|
| Form structure | 1 form, 2 inputs, 1 textarea | PASS |
| Labels | Correctly associated with all 3 controls | PASS |
| Email validation | Invalid email rejected | PASS |
| Form submission | Correct values received by local server | PASS |
| Layout | Same DOM and layout in both contexts | PASS |
| External requests | None required | PASS |
| Browser errors | None | PASS |

## Test environment

- Node.js: `v26.12.1`
- Playwright: `1.65.1`
- Chromium: `159.0.8154.6`

## Run the test

From the repository root:

```bash
node tests/course/r18-t005.mjs
```

## Test result

Both browser contexts passed. The test confirmed identical baseline DOM and layout, successful local form submissions, and no unexpected browser errors.
