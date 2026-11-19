# R18-T012 Test & Check Summary

## Overview
- **Task ID**: `R18-T012`
- **Target Page**: `accessibility/assessment-start/index.html`
- **Source Anchors**: `#name`, `#comment`
- **Test File**: `tests/course/r18-t012.mjs`
- **Review Artifacts**: `work/R18-T012/`

---

## Done When Checklist
- [x] **Usable at both widths**:
  - `360×800`: No unintended horizontal page overflow (`scrollWidth <= innerWidth`). Content order is vertically stacked (`article` followed by `.secondary`). `#name` and `#comment` are properly labelled and unclipped.
  - `1280×800`: Desktop two-column layout (`article` and `.secondary` side-by-side) preserved.
- [x] **Intentional and labelled horizontal scroll region**:
  - The 6-column bear facts table is enclosed in `.table-container` with `role="region"`, `aria-label="Bear facts table"`, and `tabindex="0"`.
- [x] **Browser check returns non-zero on assertion failure**:
  - Strict assertions in `tests/course/r18-t012.mjs` throw on any failure, logging the issue to `work/R18-T012/error.log` and calling `process.exit(1)`.
- [x] **Rejection of unexpected page errors**:
  - `page.on('pageerror')` asserts zero runtime errors.
- [x] **Baseline and changed behavior recorded**:
  - Fully documented in `work/R18-T012/baseline.md`.
- [x] **Hardware/permission isolation**:
  - `HTMLMediaElement.prototype.play` is stubbed in test contexts to prevent reliance on physical audio devices or permissions.

---

## How to Run the Checks
```bash
node tests/course/r18-t012.mjs
```

### Execution Steps Performed by Test Suite:
1. Spawns documented local server (`python3 -m http.server 8000 --bind 127.0.0.1`).
2. Polls `http://127.0.0.1:8000/accessibility/assessment-start/index.html` until readiness.
3. Tests mobile viewport (`360×800`):
   - Verifies zero unintended horizontal scroll on `document.documentElement` and `document.body`.
   - Verifies `.table-container` is labelled, keyboard-scrollable, and the only horizontal scroll area.
   - Verifies vertical content order (`article` above `.secondary`).
   - Opens comments section, verifies `#name` and `#comment` are visible, unclipped, and have associated labels.
   - Submits comment form, verifying DOM updates and input clearing.
   - Captures `mobile-360x800.png` and `mobile-comments-open.png`.
4. Tests desktop viewport (`1280×800`):
   - Verifies zero unintended horizontal scroll.
   - Verifies two-column desktop layout (`article` left of `.secondary`).
   - Verifies `#name` and `#comment` controls are unclipped.
   - Captures `desktop-1280x800.png`.
5. Cleans up server and browser processes on completion or error.
