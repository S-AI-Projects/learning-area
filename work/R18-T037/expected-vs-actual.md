# R18-T037 Expected vs Actual

## Result: PASS ✅

### Pass 1 — Rendered DOM & Computed Layout
| Assertion Target | Expected | Actual | Status |
|---|---|---|---|
| Form count | 1 | 1 | ✅ |
| Form action | `http://example.com` | `http://example.com` | ✅ |
| Form method | `get` | `get` | ✅ |
| Form computed width | `420px` | `420px` | ✅ |
| `#say` tag name | `INPUT` | `INPUT` | ✅ |
| `#say` name | `say` | `say` | ✅ |
| `#say` initial value | `Hi` | `Hi` | ✅ |
| `label[for="say"]` text | `What greeting do you want to say?` | `What greeting do you want to say?` | ✅ |
| `input[name="to"]` initial value | `Mom` | `Mom` | ✅ |
| `label[for="to"]` text | `Who do you want to say it to?` | `Who do you want to say it to?` | ✅ |
| `button` text | `Send my greetings` | `Send my greetings` | ✅ |
| Label display | `inline-block` | `inline-block` | ✅ |
| Label width | `240px` | `240px` | ✅ |
| Label text-align | `right` | `right` | ✅ |
| Label padding-right | `10px` | `10px` | ✅ |
| `#say` css float | `right` | `right` | ✅ |
| Button css float | `right` | `right` | ✅ |
| Horizontal page overflow | None (`scrollWidth <= clientWidth`) | None | ✅ |

### Pass 2 — Event Effects: Label Focus Transfer
| Assertion Target | Expected | Actual | Status |
|---|---|---|---|
| Click `label[for="say"]` | Focus transfers to `#say` | `document.activeElement.id === 'say'` | ✅ |

### Pass 3 — Event Effects: Baseline Submission (Default Values)
| Assertion Target | Expected | Actual | Status |
|---|---|---|---|
| Dispatch request | `true` | `true` | ✅ |
| Request method | `GET` | `GET` | ✅ |
| Request origin | `http://example.com` | `http://example.com` | ✅ |
| Request pathname | `/` | `/` | ✅ |
| Query param `say` | `Hi` | `Hi` | ✅ |
| Query param `to` | `Mom` | `Mom` | ✅ |
| Full serialized URL | `http://example.com/?say=Hi&to=Mom` | `http://example.com/?say=Hi&to=Mom` | ✅ |

### Pass 4 — Complete Interaction & Walkthrough (Input Editing & Submission)
| Assertion Target | Expected | Actual | Status |
|---|---|---|---|
| Edit `#say` value | `Hello, World!` | `Hello, World!` | ✅ |
| Edit `input[name="to"]` value | `Alice` | `Alice` | ✅ |
| Click submit button | Navigation to `http://example.com` | Intercepted & fulfilled | ✅ |
| Submitted HTTP method | `GET` | `GET` | ✅ |
| Query param `say` (URL-encoded) | `Hello, World!` | `Hello, World!` | ✅ |
| Query param `to` | `Alice` | `Alice` | ✅ |
| Submission URL query | `?say=Hello%2C+World%21&to=Alice` | `?say=Hello%2C+World%21&to=Alice` | ✅ |
| Submitted page echo | Full query URL matches | Matched | ✅ |
| Uncaught page errors | `[]` | `[]` | ✅ |

## Notes
- Deterministic execution: The destination `http://example.com` was stubbed with `page.route()` to avoid external network calls, record query params accurately, and prevent sandboxed DNS failures.
- Process cleanup: Server and browser instances are cleaned up reliably in a `finally` block on success and failure.
- Non-zero exit: Any assertion failure throws an `AssertionError` and sets `process.exitCode = 1`.
