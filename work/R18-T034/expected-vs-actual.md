# R18-T034 Expected vs Actual Results

| Check / Assertion | Expected | Actual | Status |
|---|---|---|---|
| Server readiness probe | HTTP 200 OK | HTTP 200 OK | PASS |
| `#search` anchor presence & type | Exactly 1 input with `type="text"`, `required` | Confirmed | PASS |
| `#search` computed dimensions | Positive width and height, visible | Width > 0, Height > 0, visible | PASS |
| Repeated `onYouTubeApiLoad` calls | No duplicate form submit listeners | Confirmed (1 execution per submit) | PASS |
| First search interaction | Exactly 1 search execution, 2 video nodes | Confirmed (calls = 1, videos = 2) | PASS |
| Second search interaction | Exactly 1 search execution, 2 video nodes (clean replacement) | Confirmed (total calls = 2, videos = 2) | PASS |
| Isolated harness repeated initialization | Exactly 1 toggle button, 1 status element | Confirmed (count = 1 each) | PASS |
| First style toggle interaction | `#search` outline `4px solid green`, status `"Highlight is on"` | Confirmed | PASS |
| Second style toggle interaction | `#search` outline removed, status `"Highlight is off"` | Confirmed | PASS |
| Total state updates | Exactly 2 updates for 2 toggle clicks | Confirmed (`updates === 2`) | PASS |
| Harness DOM cleanup | `#r18-toggle`, `#r18-status`, style removed | Confirmed (`count === 0`) | PASS |
| Harness listener cleanup | Click after cleanup causes zero state updates | Confirmed (`updates` remained 2) | PASS |
| Harness timer cleanup | Zero active test timers | Confirmed (`activeTimers === 0`) | PASS |
| Local server errors | 0 | 0 | PASS |
| Browser / page errors | 0 across all scenarios | 0 | PASS |
| Test suite exit status | 0 on pass, non-zero on failure | 0 | PASS |
