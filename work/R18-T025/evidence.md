# R18-T025 browser check evidence

## Inputs and setup

- Page: `css/styling-boxes/advanced_box_effects/filters.html`
- Check: `node tests/course/r18-t025.mjs`
- Browser viewport: 1280 × 900 CSS pixels, device scale factor 1, `en-US`, reduced motion enabled.
- Font fixture: test stylesheet fixes the document font stack to `Arial, sans-serif`; transitions are disabled so each hover result is immediate and repeatable.
- Image fixture: `css/styling-boxes/advanced_box_effects/colorful-heart.svg`, served by the check's local HTTP server; its intrinsic size is 64 × 64.
- The server is bound to an ephemeral loopback port. Browser requests outside that origin are blocked and fail the check. The test creates and closes two independent browser contexts.

## Baseline before the change

The original page contained nine figures with captions and meaningful alt text. With a deterministic 64 × 64 SVG supplied by a Playwright route in place of its remote PNG, all images decoded, all figures measured 64 × 68, and each hover produced its intended computed filter. The measured filter values were:

| Example | Expected hover filter | Baseline actual |
| --- | --- | --- |
| Blur | `blur(5px)` | `blur(5px)` |
| Brightness | `brightness(0.6)` | `brightness(0.6)` |
| Drop shadow | `drop-shadow(rgba(0, 0, 0, 0.7) 10px 10px 5px)` | Same |
| Grayscale | `grayscale(1)` | `grayscale(1)` |
| Sepia | `sepia(1)` | `sepia(1)` |
| Inversion | `invert(1)` | `invert(1)` |
| Saturation | `saturate(3)` | `saturate(3)` |
| Opacity | `opacity(0)` | `opacity(0)` |
| Hue rotation | `hue-rotate(210deg)` | `hue-rotate(210deg)` |

Baseline issue: every `<img>` requested the same image from `mdn.github.io`. The filter behavior did not need correction; the example needed a local asset and reproducible regression coverage.

## Expected versus changed actual results

| Assertion | Expected | Actual |
| --- | --- | --- |
| Initial gallery | Nine figures in the documented order, correct captions and alt text, no active filter | Passed in both contexts |
| Image and layout | Local 64 × 64 image; 64 × 68 figures; gallery wraps to two rows at 1280 × 900 | Passed in both contexts; tops were 24px for the first eight figures and 124px for the last |
| Hover and pointer exit | Each card shows only its corresponding filter while hovered, then returns to `none` on exit | All nine matched in both contexts |
| Network/runtime | No external or failed requests and no uncaught page errors | None observed in either context |
| Repeatability | Fresh contexts have identical initial DOM/layout and hover results | Deep comparison passed |

## Tool versions

- Node.js: `v26.10.0`
- Playwright: `1.65.0`
- Chromium: `158.0.8127.18`

## Command result

`node tests/course/r18-t025.mjs` exited 0 and printed `result: "PASS"`.
