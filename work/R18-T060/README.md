# R18-T060 — Work Evidence

## Overview

Task type: **Interaction regression**  
Target: `css/css-layout/legacy/html-skeleton-finished.html`  
Source anchors: Main rendered content region (`.container > .row` grid)  
Branch: `student/E26B07F0635/R18-T060`

## Files in This Directory

| File | Description |
|------|-------------|
| `baseline-results.md` | Baseline behavior — grid structure and column widths |
| `expected-vs-actual.md` | Table comparing expected vs actual check results |
| `results.md` | Final test results summary |
| `environment.txt` | Node/Playwright/OS version info |
| `test-output.txt` | Raw output from `node tests/course/r18-t060.mjs` |
| `baseline-desktop.png` | Screenshot at 1200×800 (desktop, correct state) |
| `after-checks.png` | Screenshot after all checks ran (fixture removed, layout restored) |
| `README.md` | This file |

## Key Findings

- **Grid is correct**: `.six.columns` = 48%, `.three.columns` = 22%, `.two.columns` = 13.33% at 1200px
- **Float active**: All `.column`/`.columns` elements have `float: left`
- **Deliberate break works**: Injecting `float: none !important; width: 100% !important` collapses `.six.columns` from 48% → 100%, which the `brokenSixPct >= 90` assertion catches
- **No mutation in final app**: The break style is injected and removed purely within the test; the committed HTML/CSS is unchanged

## How to Reproduce

```bash
cd /path/to/learning-area
node tests/course/r18-t060.mjs
# Expected: exit code 0, all 10 checks pass
```
