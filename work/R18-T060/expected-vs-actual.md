# R18-T060 — Expected vs Actual

## Task Type: Interaction Regression

| Check | Expected | Actual | Status |
|-------|----------|--------|--------|
| No unexpected console errors | `[]` | `[]` | ✅ Pass |
| `.container` and `.row` children present | container≥1, rows≥2 | 1, 2 | ✅ Pass |
| Row 1 has 12 "one column" cells | 12 | 12 | ✅ Pass |
| Row 2 has 4 cells with correct spans | 1+6+3+2 = 12 | 1+6+3+2 | ✅ Pass |
| `.six.columns` width ≈ 48% | 44–52% | 48.00% | ✅ Pass |
| `.three.columns` width ≈ 22% | 18–26% | 22.00% | ✅ Pass |
| `.two.columns` width ≈ 13.3% | 9–18% | 13.33% | ✅ Pass |
| `.one.column` has `float: left` | `"left"` | `"left"` | ✅ Pass |
| Deliberate break: float:none collapses grid | `.six.columns` ≥ 90% | 100.00% | ✅ Pass |
| Layout restored after fixture removed | `float: left` | `"left"` | ✅ Pass (part of Check 9) |
| No unexpected page errors | `[]` | `[]` | ✅ Pass |

## Deliberate Break — Before/After

| State | `.six.columns` width |
|-------|---------------------|
| **Correct** (float:left active) | 48.00% |
| **Broken** (float:none injected) | 100.00% |
| **Restored** (fixture removed) | 48.00% |

The assertion `brokenSixPct >= 90` correctly distinguishes the broken state from the correct state.
The final application contains **no mutation** — the fixture is fully removed before the test ends.
