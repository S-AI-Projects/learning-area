# R18-T039 Expected vs Actual

## Result: PASS ✅

### Pass A — Standard Motion (`no-preference`)
| Assertion Target | Expected | Actual | Status |
|---|---|---|---|
| `#power` exists | 1 | 1 | ✅ |
| `#power` transition duration | `0.4s` | `0.4s` | ✅ |
| Page errors | `[]` | `[]` | ✅ |

### Pass B — Reduced Motion (`reduce`) on Mobile (390 × 844)
| Assertion Target | Expected | Actual | Status |
|---|---|---|---|
| Media query matches | `true` | `true` | ✅ |
| `#power` transition duration | `0s` | `0s` | ✅ |
| Keyboard focus via Tab | `document.activeElement === #power` | `true` | ✅ |
| Outline style | `solid` (not none) | `solid` | ✅ |
| Outline width | `2px` (> 0) | `2px` | ✅ |
| Outline offset | `2px` | `2px` | ✅ |
| Inside viewport | `true` | `true` | ✅ |
| Space-key toggle | `checked = true` | `true` | ✅ |
| Label "On" opacity | `1` | `1` | ✅ |
| Label "Off" opacity | `0` | `0` | ✅ |
| Background color | `rgb(255, 170, 0)` | `rgb(255, 170, 0)` | ✅ |
| Page errors | `[]` | `[]` | ✅ |

### Pass C — Reduced Motion (`reduce`) on Desktop (1280 × 800)
| Assertion Target | Expected | Actual | Status |
|---|---|---|---|
| Media query matches | `true` | `true` | ✅ |
| `#power` transition duration | `0s` | `0s` | ✅ |
| Keyboard focus via Tab | `document.activeElement === #power` | `true` | ✅ |
| Outline style | `solid` (not none) | `solid` | ✅ |
| Outline width | `2px` (> 0) | `2px` | ✅ |
| Outline offset | `2px` | `2px` | ✅ |
| Inside viewport | `true` | `true` | ✅ |
| Space-key toggle | `checked = true` | `true` | ✅ |
| Label "On" opacity | `1` | `1` | ✅ |
| Label "Off" opacity | `0` | `0` | ✅ |
| Background color | `rgb(255, 170, 0)` | `rgb(255, 170, 0)` | ✅ |
| Page errors | `[]` | `[]` | ✅ |

## Notes
- Reduced-motion emulation (`reducedMotion: 'reduce'`) leaves all information and controls fully usable; state changes snap immediately without animation.
- The keyboard focus indicator remains clearly visible and well-separated from the border via `outline-offset: 2px` at both 390px and 1280px widths.
