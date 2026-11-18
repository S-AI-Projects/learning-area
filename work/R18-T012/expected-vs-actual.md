# Expected vs. Actual Results (R18-T012)

| Check ID | Assertion / Verification | Viewport | Expected | Actual | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CHK-01** | Mobile Horizontal Overflow | 360×800 | `hasOverflow: false` | `hasOverflow: false` (`360px == 360px`) | **PASS** |
| **CHK-02** | Intentional Scroll Demonstration | 360×800 | `role="region"`, `aria-label="Bear facts table"`, `tabindex="0"` | `role="region"`, `aria-label="Bear facts table"`, `tabindex="0"` | **PASS** |
| **CHK-03** | Mobile Content Order | 360×800 | `article.y < secondary.y` | `article.y < secondary.y` (vertical stack) | **PASS** |
| **CHK-04** | Controls Usability (#name, #comment) | 360×800 | `width >= 120px`, unclipped | `#name: 260px`, `#comment: 260px`, inside viewport | **PASS** |
| **CHK-05** | Form Labels Associated | 360×800 | `<label for="name">`, `<label for="comment">` | Both present and linked | **PASS** |
| **CHK-06** | Comment Form Event Effects | 360×800 | Comment appended, inputs reset | Appended and inputs cleared | **PASS** |
| **CHK-07** | Desktop Horizontal Overflow | 1280×800 | `hasOverflow: false` | `hasOverflow: false` | **PASS** |
| **CHK-08** | Desktop Content Order | 1280×800 | Side-by-side (`article.x < secondary.x`) | Side-by-side (`article.x < secondary.x`) | **PASS** |
| **CHK-09** | Desktop Controls Usability | 1280×800 | Inside viewport, unclipped | Fully visible and accessible | **PASS** |
| **CHK-10** | Page Error Rejection | Both | 0 page errors | 0 page errors | **PASS** |

## Summary of Checklist Completion
- [x] **At both widths the main content is usable**: Mobile (360×800) and Desktop (1280×800) are fully usable with zero unintended horizontal overflow.
- [x] **Horizontal scroll region is intentional and labelled**: The 6-column bear facts table is encapsulated in a labelled scrollable region (`role="region"`, `aria-label="Bear facts table"`, `tabindex="0"`).
- [x] **Browser check returns nonzero on assertion failure**: Strict assertions in `tests/course/r18-t012.mjs` fail fast and exit non-zero.
- [x] **Baseline and changed behavior recorded**: Detailed in `work/R18-T012/baseline.md`.
- [x] **Native features requiring permissions/hardware stubbed**: Media playback (`HTMLMediaElement.prototype.play`) stubbed during testing.
