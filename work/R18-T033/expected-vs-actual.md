# R18-T033 Expected vs Actual Results

| Check / Scenario | Expected | Actual | Status |
|---|---|---|---|
| Server readiness probe | HTTP 200 OK | HTTP 200 OK | PASS |
| Baseline player controls | Enabled (`play`, `stop`) | Enabled (`play`, `stop`) | PASS |
| Baseline fallback banner | Hidden (`display: none`) | Hidden (`isVisible: false`) | PASS |
| Transcript disclosure | Expands to 150px on click | 150px height confirmed | PASS |
| Transcript collapse | Collapses to 0px on second click | 0px height confirmed | PASS |
| Failed asset fallback banner | Visible with descriptive message | Visible (`"Audio failed to load..."`) | PASS |
| Failed asset direct fallback link | Present and links to audio | Present (`<a href="../viper.mp3">`) | PASS |
| Failed asset control state | Controls disabled gracefully | Buttons `disabled === true` | PASS |
| Safe control interaction on failure | Zero uncaught errors on click | 0 uncaught errors | PASS |
| Asset recovery banner | Hides upon media recovery | Hidden (`display: none`) | PASS |
| Asset recovery control state | Controls re-enabled | Buttons `disabled === false` | PASS |
| Empty result fixture title | Includes "Empty Result Fixture" | Confirmed | PASS |
| Empty result transcript state | Displays "No transcript is available for this recording." | Confirmed visible | PASS |
| Server errors | 0 | 0 | PASS |
| Page / console errors | 0 across all scenarios | 0 | PASS |
| Test suite exit code | 0 on pass, non-zero on failure | 0 | PASS |
