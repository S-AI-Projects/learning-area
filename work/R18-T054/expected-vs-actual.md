# R18-T054 Expected vs Actual Results

## Test Matrix

| Scenario / Check | Test Action | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **1. Baseline Repeat Load 1** | Initial page load | Exactly 1 form, 1 fieldset, 1 legend, 3 radio inputs | 1 form, 1 fieldset, 1 legend, 3 inputs found | PASS |
| **1. Baseline Repeat Load 2** | Reload page in same context | Exactly 1 form, 1 fieldset, 1 legend, 3 radio inputs (no duplicate nodes) | 1 form, 1 fieldset, 1 legend, 3 inputs found | PASS |
| **1. Computed CSS Styles** | Inspect radio input computed layout | `appearance: none`, `width: 20px`, `height: 20px`, `border-radius: 10px` | `none`, `20px`, `20px`, `10px` | PASS |
| **2. Mutual Exclusivity** | Check cherry, then check banana | Banana checked, cherry unchecked | Banana checked: true, cherry checked: false | PASS |
| **2. Repeated Interaction** | Check cherry again | Cherry checked, banana unchecked; no duplicate nodes | Cherry checked: true, banana checked: false; node counts singular | PASS |
| **3. Harness Repeat Init** | Call harness `init()` twice consecutively | Previous listeners/timers/DOM elements reset; exactly 1 button, 1 panel, 1 listener, 1 timer | 1 button, 1 panel, 1 listener, 1 timer | PASS |
| **3. Single Updates per Interaction** | Click harness toggle button twice | Click 1 activates accent class; click 2 deactivates; exactly 2 updates recorded | First click: active; second click: inactive; 2 total clicks | PASS |
| **3. Complete Cleanup** | Execute `cleanup()` | Toggle button removed, panel removed, activeListeners = 0, activeTimers = 0, timer ticks halt | 0 buttons, 0 panels, 0 listeners, 0 timers, timer halted | PASS |
| **4. Zero Unexpected Errors** | Listen across all scenarios | Zero page errors, zero console errors | 0 errors detected | PASS |
