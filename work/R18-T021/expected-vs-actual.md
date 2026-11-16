# R18-T021 Expected vs Actual

| Check | Expected | Actual |
|---|---|---|
| Baseline main landmark | Absent | Absent |
| Baseline skip link | Absent | Absent |
| Baseline Tab behavior | No page control receives focus | `BODY` remained active |
| Changed main landmark | Exactly one | PASS |
| Changed teaching content | “This is my page” remains | PASS |
| Changed skip link | Present and targets `#main-content` | PASS |
| Changed Tab traversal | First Tab focuses skip link | PASS |
| Visible focus | Indicator styled and link rectangle inside viewport | PASS |
| Enter activation | Fragment becomes `#main-content` | PASS |
| Main focus | Main landmark receives focus | PASS |
| Positive tabindex | None | PASS |
| Local server errors | None | PASS |
| Browser, console, and request errors | None | PASS |
| Test exit status | 0 | PASS |
