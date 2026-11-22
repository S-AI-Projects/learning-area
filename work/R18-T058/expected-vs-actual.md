# R18-T058 — Expected vs Actual

## Task Type: Safe Text Rendering

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| No unexpected console errors | `[]` | `[]` | ✅ Pass |
| `<audio>` element present | ≥ 1 | 1 | ✅ Pass |
| `<video>` element present | ≥ 1 | 1 | ✅ Pass |
| Fallback `<a>` links render as plain text | ≥ 2 links, 0 child elements, no HTML chars in text | 2 links, 0 child elements, plain text | ✅ Pass |
| Custom control buttons exist and have plain text | ≥ 2 play/pause buttons, 0 children, no HTML | 2 buttons, 0 children, `"Play"` | ✅ Pass |
| Fixture string `"Play"` is plain text, no injected element | `children.length === 0` | 0 | ✅ Pass |
| Time label `"00:00"` is plain text | `textContent === "00:00"`, 0 children | `"00:00"`, 0 children | ✅ Pass |
| Fixture string `"Stop"` is plain text | `textContent === "Stop"`, 0 children | `"Stop"`, 0 children | ✅ Pass |
| XSS probe: textContent does not execute script | `children.length === 0`, `window.__xssRan === undefined` | 0, undefined | ✅ Pass |
| No unexpected page errors | `[]` | `[]` | ✅ Pass |

## Key Insight

The existing code uses `textContent` throughout. Setting `element.textContent = '<img src=x onerror=...>'` **does not** create a child element or run the onerror handler — it stores the raw string as a text node. This is confirmed by Check 9.

If the code were changed to `element.innerHTML = '<img src=x onerror=...>'`, the checks would fail because `children.length` would be 1 and the onerror handler might execute.
