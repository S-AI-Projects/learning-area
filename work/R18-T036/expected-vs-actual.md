# R18-T036 Expected vs Actual

## Result: PASS ✅

### Pass A — Feature-present (native video support)
| Assertion | Expected | Actual | Status |
|---|---|---|---|
| `<video>` count | 1 | 1 | ✅ |
| `video[src]` | includes `rabbit320.webm` | `rabbit320.webm` | ✅ |
| `controls` attribute | present | present | ✅ |
| `<video>` visible | true | true | ✅ |
| Fallback `<a>` count | 1 | 1 | ✅ |
| Fallback `<a href>` | includes `rabbit320.webm` | `rabbit320.webm` | ✅ |
| Page errors | [] | [] | ✅ |

### Pass B — Feature-absent (canPlayType stubbed to return "")
| Assertion | Expected | Actual | Status |
|---|---|---|---|
| Fallback `<a>` count | 1 | 1 | ✅ |
| Fallback `<a href>` | includes `rabbit320.webm` | `rabbit320.webm` | ✅ |
| Fallback link text | non-empty | "link to the video" | ✅ |
| Asset on disk | exists | exists | ✅ |
| Fallback `<p>` text | includes "doesn't support" | ✓ | ✅ |
| `canPlayType` stub result | `""` | `""` | ✅ |
| Page errors | [] | [] | ✅ |

## Notes
- No code changes made to the HTML — baseline was already correct
- `canPlayType` is overridden via `addInitScript` (not removed), keeping the stub explicit and documented
- The fallback `<a>` link targets the same `rabbit320.webm` file confirming the demo's graceful degradation teaching is correct
