# R18-T038 Expected vs Actual

## Result: PASS ✅

### Pass 1 — Target Canvas Page (`javascript/oojs/assessment/index.html`)
| Assertion Target | Expected | Actual | Status |
|---|---|---|---|
| Canvas count | 1 | 1 | ✅ |
| Canvas visible | `true` | `true` | ✅ |
| Canvas width | `1280px` | `1280px` | ✅ |
| Canvas height | `800px` | `800px` | ✅ |
| Heading text | `bouncing balls` | `bouncing balls` | ✅ |
| Ball count text | Contains `Ball count:` | `Ball count: 25` | ✅ |
| Payload fixture rendering | Literal text | `<img src=x onerror="alert(1)"><script>window.__injected=true</script>` | ✅ |
| Injected `<img>` count | 0 | 0 | ✅ |
| Injected `<script>` count | 0 | 0 | ✅ |
| Script execution (`window.__injected`) | `false` | `false` | ✅ |
| Alert dialog count | 0 | 0 | ✅ |
| Horizontal page overflow | None (`scrollWidth <= clientWidth`) | None | ✅ |
| Uncaught page errors | `[]` | `[]` | ✅ |

### Pass 2 — Companion Page (`javascript/oojs/assessment/text-rendering.html`)
| Assertion Target | Expected | Actual | Status |
|---|---|---|---|
| Companion HTTP status | 200 | 200 | ✅ |
| Input control `#user-text` | Present | Present | ✅ |
| Button control `#show-text` | Present | Present | ✅ |
| Output control `#output` | Present | Present | ✅ |
| Rendered text in `#output` | Literal payload string | `<img src=x onerror="alert(1)"><script>window.__injected=true</script>` | ✅ |
| Injected `<img>` inside `#output` | 0 | 0 | ✅ |
| Injected `<img>` in entire page | 0 | 0 | ✅ |
| Injected `<script>` inside `#output` | 0 | 0 | ✅ |
| Handler execution (`alert`) | 0 dialogs | 0 dialogs | ✅ |
| Handler execution (`window.__injected`) | `false` | `false` | ✅ |
| `#output` computed display | `block` | `block` | ✅ |
| `#output` visibility | `true` | `true` | ✅ |
| Uncaught page errors | `[]` | `[]` | ✅ |

## Notes
- The payload `<img src=x onerror="alert(1)"><script>window.__injected=true</script>` contains both an HTML element with an inline event handler and a `<script>` tag.
- In both the target assessment page and the companion page, the payload renders strictly as harmless literal text. No DOM nodes are created from the markup and no JavaScript handlers are invoked.
