# Baseline & Empty/Fallback Analysis: `items-sold.html`

## Target Page
- **Path**: `html/tables/advanced/items-sold.html`
- **Linked Stylesheet**: `html/tables/advanced/minimal-table.css`
- **Linked Script**: None (pure static HTML)
- **Source Anchor**: `table`

---

## 1. Baseline Inspection (Before Editing)

### A. Purpose & Structure
- The `table` element in `items-sold.html` demonstrates advanced HTML table techniques from MDN Web Docs:
  - Multi-level column headers using `colspan` (`colspan="3"` for Clothes, `colspan="2"` for Accessories).
  - Rowgroup headers using `rowspan` (`rowspan="3"` for Belgium, `rowspan="2"` for The Netherlands).
  - Column subheadings (Trousers, Skirts, Dresses, Bracelets, Rings) and row subheadings (Antwerp, Ghent, Brussels, Amsterdam, Utrecht).
  - A descriptive `<caption>` ("Items Sold August 2016").
  - Linked stylesheet `minimal-table.css` provides standard table borders, padding, and alternating row backgrounds.

### B. Deficiencies & Gap Analysis
1. **Lack of Empty / Fallback State**:
   - The page assumed a static, always-populated dataset.
   - If an asset (such as an image or font) failed to load, there was no structured fallback or accessible alternative in the DOM.
   - If a sales reporting period yielded zero results, there was no empty result representation to communicate that data was unavailable rather than broken.
2. **No Interactive Input Recovery**:
   - As a purely static table, there was no mechanism to filter or query records, and thus no mechanism to experience an empty state or recover from it via user input.
3. **No External API Dependencies**:
   - Consistent with task guidance, no complex backend or arbitrary REST API was needed; the example is static and should exercise missing image/font fallbacks and an empty result fixture.

---

## 2. Changed Behavior & Remediation

1. **Asset Failure Handling & Readable Fallback**:
   - Added `sales-report-icon.png` in the heading alongside an accessible fallback element `<span id="icon-fallback" class="icon-fallback" style="display:none;" aria-label="Sales Report">📊</span>`.
   - Wired `onerror` on the image to gracefully hide the broken image icon and display the readable text/emoji fallback without throwing uncaught exceptions.
   - Computed styles ensure the fallback maintains appropriate font sizing, alignment, and legibility.
2. **Interactive Empty State on Invalid Input & Recovery on Valid Input**:
   - Added `<div class="table-controls">` with `<input type="search" id="table-filter">`.
   - Added an empty state row `<tr id="empty-state-row" class="empty-state" style="display: none;"><td colspan="7">No matching sales records found.</td></tr>`.
   - When unmatched input (e.g., `"NonexistentLocation"`) is entered, all data rows hide and the meaningful empty message is displayed.
   - When valid input (e.g., `"Belgium"`) is entered or the search input is cleared, the table rows recover immediately.
3. **Static Empty Result Fixture**:
   - Added `html/tables/advanced/fixtures/items-sold-empty.html`.
   - Preserves identical `<caption>` and `<thead>` headers while rendering a full-width empty state cell `<td colspan="7" class="empty-message">No items sold recorded for this period.</td>`.
   - Allows testing static empty data scenarios without mocking network APIs.
4. **Teaching Purpose Retained**:
   - All original `colspan`, `rowspan`, and table structures are 100% preserved.
