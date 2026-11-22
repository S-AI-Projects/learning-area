# R18-T059 — Baseline Results

## Task
**Motion and focus preferences** for `html/forms/sending-form-data/get-method.html`  
**Source anchor**: `#say`

## Baseline Behavior (Before Changes)

### Page Structure
- One `<form method="get" action="http://example.com">`
- Two `<input>` fields: `#say` (name="say", value="Hi") and an unnamed "to" field
- One `<button>Send my greetings</button>`
- Inline `<style>` block — no external CSS or JS

### Motion Analysis
| Property | Value on `#say` | Safe? |
|----------|-----------------|-------|
| `animation-name` | `none` | ✅ No motion |
| `animation-duration` | `0s` | ✅ No motion |
| `transition-duration` | `0s` | ✅ No motion |

**No CSS animations or transitions are present anywhere on the page.** The page is purely static, so `prefers-reduced-motion: reduce` has no effect — which is the correct baseline.

### Keyboard Focus Analysis
| Viewport | Focused Element | `outline-style` | `outline-width` | Visible? |
|----------|-----------------|-----------------|-----------------|----------|
| 1280px (desktop) | `#say` | `auto` | `1px` | ✅ Yes |
| 375px (mobile) | `#say` | `auto` | `1px` | ✅ Yes |

The focus indicator comes from the browser UA stylesheet. The page does **not** suppress it with `outline: none` or `outline: 0`.

### Static Layout (GET method regression)
- `form[method]` = `get` ✅
- `form[action]` = `http://example.com` ✅
- `#say[name]` = `say` ✅
- `label[for="say"]` exists ✅

## Environment
- Node.js: v26.13.0
- Playwright: 1.65.1
- Chromium: Playwright bundled
- OS: macOS
- Date: 2026-11-23
