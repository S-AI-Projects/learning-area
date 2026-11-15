# R18-T051 Expected vs Actual Results

## Test Matrix

| Check / Test Case | Input / Action | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **HTTP Server & Page Load** | Navigate to `http://127.0.0.1:<port>/css/css-layout/practical-positioning-examples/fixed-info-box.html` | Page loads with HTTP 200; no 404 or connection failures | HTTP 200 returned; page title "Fixed tabbed info box" | PASS |
| **CSS Fixed Layout** | Inspect computed styles of `.info-box` | `position: fixed`, `width: 452px`, `height: 400px`, `top: 0px` | `position: fixed`, `width: 452px`, `height: 400px`, `top: 0px` | PASS |
| **Initial ARIA States** | Query `#tab-1`, `#tab-2`, `#tab-3`, and panels | `#tab-1` selected (`aria-selected="true"`), `#tabpanel-1` visible; `#tab-2`, `#tab-3` unselected, `#tabpanel-2`, `#tabpanel-3` hidden | `#tab-1` selected, panel 1 visible; other tabs unselected, other panels hidden | PASS |
| **Tab Traversal to Tab** | Press `Tab` from initial page state | `#tab-1` receives keyboard focus; visible outline on child `<span>` | `#tab-1` focused; `outlineStyle: solid`, `outlineWidth: 1px`, `outlineColor: rgb(0,0,255)` | PASS |
| **Tab Traversal to Tabpanel** | Press `Tab` from `#tab-1` | Active `#tabpanel-1` receives focus with visible outline | `#tabpanel-1` focused; `outlineStyle: solid`, `outlineWidth: 2px`, `outlineColor: rgb(0,0,255)` | PASS |
| **Reverse Traversal** | Press `Shift+Tab` from `#tabpanel-1` | Focus returns to `#tab-1` | `#tab-1` focused | PASS |
| **Arrow Navigation** | Press `ArrowRight`, `ArrowLeft`, `Home`, `End` | Cycles through tabs in sequence with wrapping; Home focuses tab 1, End focuses tab 3 | ArrowRight moves tab 1 -> tab 2 -> tab 3 -> tab 1; ArrowLeft wraps tab 1 -> tab 3; Home/End work | PASS |
| **Enter Activation** | Focus `#tab-2`, press `Enter` | `#tab-2` becomes `aria-selected="true"`, `#tabpanel-2` is shown, `#tabpanel-1` hidden | `#tab-2` selected, `#tabpanel-2` visible; subsequent Tab enters `#tabpanel-2` | PASS |
| **Space Activation** | Focus `#tab-3`, press `Space` | `#tab-3` becomes `aria-selected="true"`, `#tabpanel-3` is shown, `#tabpanel-2` hidden | `#tab-3` selected, `#tabpanel-3` visible; subsequent Tab enters `#tabpanel-3` | PASS |
| **No Positive Tabindex** | Scan document for `[tabindex]` attributes | No element has `tabindex > 0` | 0 elements with positive tabindex found | PASS |
| **Page Errors** | Listen for runtime errors, unhandled exceptions, console errors | Zero errors | 0 errors detected | PASS |
