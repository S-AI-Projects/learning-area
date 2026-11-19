# Expected vs. Actual Results (R18-T013)

| Check ID | Verification / Assertion | Expected | Actual | Status |
| :--- | :--- | :--- | :--- | :--- |
| **CHK-01** | Page Title | `"Items sold summary"` | `"Items sold summary"` | **PASS** |
| **CHK-02** | Table Caption | `"Items Sold August 2016"` | `"Items Sold August 2016"` | **PASS** |
| **CHK-03** | Baseline Sales Rows | `5` rows | `5` rows | **PASS** |
| **CHK-04** | Failed Asset Fallback | Fallback element rendered & visible | Fallback element visible, icon hidden | **PASS** |
| **CHK-05** | Asset Restoration | `naturalWidth > 0` | `naturalWidth: 24px` | **PASS** |
| **CHK-06** | Empty State on Invalid Input | Displays `"No matching sales records found."` | Displays `"No matching sales records found."` | **PASS** |
| **CHK-07** | Recovery on Valid Input | Matching rows visible, empty row hidden | Matching rows visible (Belgium rows) | **PASS** |
| **CHK-08** | Static Empty Fixture | `colspan="7"`, descriptive empty message | `colspan="7"`, message present | **PASS** |
| **CHK-09** | Restored Fixture Recovery | Full `5` rows restored | `5` rows restored | **PASS** |
| **CHK-10** | Uncaught Error Rejection | `0` errors logged | `0` errors logged | **PASS** |

## Checklist Verification
- [x] **Meaningful empty/error/fallback state**: Exercised both static empty result fixture (`items-sold-empty.html`) and failed image fallback.
- [x] **Recovers after valid input or restored fixture**: Tested recovery via valid filter input (`"Belgium"`) and restoring standard table fixture.
- [x] **Zero uncaught errors**: No uncaught runtime exceptions logged.
- [x] **Strict assertion failure handling**: `tests/course/r18-t013.mjs` exits non-zero on any failure.
- [x] **Baseline & changed behavior recorded**: Thoroughly documented in `work/R18-T013/baseline.md`.
