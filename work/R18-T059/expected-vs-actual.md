# R18-T059 — Expected vs Actual

## Task Type: Motion and Focus Preferences

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| No unexpected console errors | `[]` | `[]` | ✅ Pass |
| `#say` input exists and is visible | count=1, visible=true | count=1, visible=true | ✅ Pass |
| No CSS animation on `#say` | `animation-name: none`, `duration: 0s` | `none`, `0s` | ✅ Pass |
| No animation/transition on any element | 0 animated elements | 0 animated elements | ✅ Pass |
| `prefers-reduced-motion:reduce` — form and controls present | form count=1, `#say` count=1 | 1, 1 | ✅ Pass |
| `prefers-reduced-motion:reduce` — `#say` visible, no animation | visible=true, 0 animated elements | true, 0 | ✅ Pass |
| Focus visible at 1280px | `outline-style !== none` OR `box-shadow !== none` | `outline-style: auto`, `outline-width: 1px` | ✅ Pass |
| Focus visible at 375px | `outline-style !== none` OR `box-shadow !== none` | `outline-style: auto`, `outline-width: 1px` | ✅ Pass |
| Static layout regression | `method=get`, `action≠""`, `#say[name=say]`, `label[for=say]` | all correct | ✅ Pass |
| No unexpected page errors | `[]` | `[]` | ✅ Pass |

## Key Insight

The page has no animations whatsoever, so `prefers-reduced-motion` has no effect to test beyond confirming the page remains functional. The focus check confirms the browser UA outline is not suppressed at either viewport width — a common accessibility regression introduced when authors add `* { outline: none }` or `:focus { outline: none }`.
