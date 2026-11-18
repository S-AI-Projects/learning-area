# Expected vs. Actual Results (R18-T011)

| Check ID | Assertion / Verification | Expected | Actual | Status |
| :--- | :--- | :--- | :--- | :--- |
| **CHK-01** | Page Title | `"Bad semantics example"` | `"Bad semantics example"` | **PASS** |
| **CHK-02** | Skip Link Element Count | `1` | `1` | **PASS** |
| **CHK-03** | Skip Link Href Target | `"#main"` | `"#main"` | **PASS** |
| **CHK-04** | Main Region (`<main id="main" tabindex="-1">`) | `tag: "main", id: "main", tabindex: "-1"` | `tag: "main", id: "main", tabindex: "-1"` | **PASS** |
| **CHK-05** | Retained Bad-Semantics Tags | `<font size="7">`, `<font size="5">` intact | `<font size="7">`, `<font size="5">` intact | **PASS** |
| **CHK-06** | Unfocused CSS Layout Preserved | Off-screen / clipped; heading offset y <= 30px | Off-screen / clipped; heading offset y = 16px | **PASS** |
| **CHK-07** | Keyboard Tab Traversal | `document.activeElement` is `a.skip-link` | `document.activeElement` is `a.skip-link` | **PASS** |
| **CHK-08** | Visible Focus Styling | Rendered in viewport (`y >= 0`), visible outline/border | Bounding box at `(0, 0)`, 3px solid outline, 2px border | **PASS** |
| **CHK-09** | Keyboard Activation (Enter) URL Hash | URL hash ends with `"#main"` | URL hash ends with `"#main"` | **PASS** |
| **CHK-10** | Focus Shift on Activation | Focus moves to `#main` (`activeElement.id === 'main'`) | `activeElement.id === 'main'` | **PASS** |

## Assertion Rigor
All assertions are strict equality / bounded numerical comparisons. In `tests/course/r18-t011.mjs`, node's `assert/strict` is used to enforce exact behavioral outcomes and cause non-zero exit codes on any failure.
