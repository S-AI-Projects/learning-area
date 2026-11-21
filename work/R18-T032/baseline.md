# R18-T032 Baseline Results

Target page: `html/introduction-to-html/getting-started/index.html`
Base revision: `2197326ba859ff3477919087b488157f9d618a6` (`upstream/main`)

## Page Classification
- Page type: Static HTML demonstration / introductory starter page for HTML basics.
- Teaching purpose: Introduces a minimal HTML document containing a paragraph `<p>This is my page</p>` and a responsive `<meta name="viewport" content="width=device-width">` tag.
- Source anchors: The main rendered content region (`body > p`).

## Baseline Observations (Parent Revision)
- Evaluated with Playwright Chromium headless across two target viewports:
  1. **Mobile (360×800):**
     - Document scroll width: `360px`, client width: `360px`.
     - Horizontal overflow: `false` (`scrollWidth <= clientWidth`).
     - Paragraph rendered bounds: `x = 8px`, `right = 352px` (completely within 360px width).
     - Text content: `"This is my page"` is intact and clearly readable.
     - Controls/content clipping: None.
     - Content order: Preserved (`['p']`).
     - Unexpected scroll regions: None.
  2. **Desktop (1280×800):**
     - Document scroll width: `1280px`, client width: `1280px`.
     - Horizontal overflow: `false` (`scrollWidth <= clientWidth`).
     - Paragraph rendered bounds: `x = 8px`, `right = 1272px` (completely within 1280px width).
     - Text content: `"This is my page"` is intact and readable.
     - Controls/content clipping: None.
     - Content order: Preserved (`['p']`).
     - Unexpected scroll regions: None.

## Conclusion
The baseline page already behaves correctly across both required viewport sizes (360×800 and 1280×800) due to its standard markup and existing responsive viewport meta tag. In strict accordance with Step 2 ("If the target behavior is already correct, contribute the regression test and precise documentation rather than manufacturing a defect"), no unnecessary or artificial defects were introduced. The automated Playwright regression test suite `tests/course/r18-t032.mjs` and full evidence have been contributed to prevent future regressions.
