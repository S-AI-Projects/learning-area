# R18-T059 — Work Evidence

## Overview

Task type: **Motion and focus preferences**  
Target: `html/forms/sending-form-data/get-method.html`  
Source anchor: `#say`  
Branch: `student/E26B07F0635/R18-T059`

## Files in This Directory

| File | Description |
|------|-------------|
| `baseline-results.md` | Baseline behavior analysis (motion, focus, structure) |
| `expected-vs-actual.md` | Table comparing expected vs actual check results |
| `results.md` | Final test results summary |
| `environment.txt` | Node/Playwright/OS version info |
| `test-output.txt` | Raw output from `node tests/course/r18-t059.mjs` |
| `baseline-desktop.png` | Screenshot at 1280×800 (desktop) |
| `baseline-mobile.png` | Screenshot at 375×812 (mobile) |
| `reduced-motion-desktop.png` | Screenshot under `prefers-reduced-motion: reduce` |
| `focus-desktop.png` | Screenshot with `#say` focused at 1280px |
| `focus-mobile.png` | Screenshot with `#say` focused at 375px |
| `README.md` | This file |

## Findings

- **No motion present**: The page has no CSS animations or transitions on any element, including `#say`.
- **prefers-reduced-motion:reduce**: Has no visual effect (nothing to suppress); form and controls remain fully usable.
- **Keyboard focus**: The browser UA stylesheet provides a visible `outline: auto` on `#say` at both desktop (1280px) and mobile (375px) widths. The page CSS does not suppress the focus indicator.

## How to Reproduce

```bash
cd /path/to/learning-area
node tests/course/r18-t059.mjs
# Expected: exit code 0, all 10 checks pass
```
