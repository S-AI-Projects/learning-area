# R18-T013 Test & Check Summary

## Overview
- **Task ID**: `R18-T013`
- **Target Page**: `html/tables/advanced/items-sold.html`
- **Source Anchor**: `table`
- **Empty Fixture**: `html/tables/advanced/fixtures/items-sold-empty.html`
- **Test File**: `tests/course/r18-t013.mjs`
- **Review Artifacts**: `work/R18-T013/`

---

## Done When Checklist
- [x] **Meaningful empty/error/fallback state**:
  - A static empty result fixture (`html/tables/advanced/fixtures/items-sold-empty.html`) provides a complete table with an empty-state cell spanning all 7 columns.
  - A failed image asset request cleanly triggers a readable fallback icon/label without throwing runtime errors.
  - An interactive search/filter demonstrates dynamic transition into an empty result state on invalid/unmatched query.
- [x] **Recovers after valid input or restored fixture**:
  - Restoring valid input in the filter input recovers all matching sales rows.
  - Navigating back from the empty result fixture recovers all standard sales data.
  - Restoring the blocked asset route restores the original image badge.
- [x] **Zero uncaught page errors**:
  - Monitored via Playwright page error listener.
- [x] **Strict assertion failure handling**:
  - `tests/course/r18-t013.mjs` uses `node:assert/strict` and exits non-zero on any failure.
- [x] **Baseline & changed behavior recorded**:
  - Fully recorded in `work/R18-T013/baseline.md`.

---

## How to Run the Checks
```bash
node tests/course/r18-t013.mjs
```

### Execution Flow:
1. Spawns documented local server (`python3 -m http.server 8000 --bind 127.0.0.1`).
2. Polls `http://127.0.0.1:8000/html/tables/advanced/items-sold.html` until HTTP 200 readiness.
3. Tests baseline table structure (caption, headers, 5 sales rows).
4. Tests failed asset request (aborts `sales-report-icon.png`) and asserts readable fallback activation and zero uncaught errors.
5. Restores asset route and asserts full recovery of the image.
6. Enters invalid filter input and asserts empty state row display with meaningful messaging.
7. Enters valid input (`"Belgium"`) and asserts row recovery.
8. Tests static empty result fixture (`items-sold-empty.html`) and verifies `colspan="7"` empty message.
9. Returns to main page and verifies data restoration.
10. Cleans up server and browser processes on completion or failure.
