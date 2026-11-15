# R18-T052 Baseline Observations

## Target Page
`accessibility/assessment-start/assessment-files/index.html`

## Tested Viewports
- Mobile: 360×800
- Desktop: 1280×800

## Baseline Inspection Findings

### 1. Viewport 360×800 (Mobile)
- **Document scrollWidth**: 1024px in a 360px viewport.
- **Horizontal Overflow**: **Yes**, severe overflow of 664px.
  - Caused by `body { width: 80%; min-width: 1024px; }` in `style.css`.
  - Caused by fixed width on audio: `audio { width: 500px; }`.
  - Caused by natural image widths (500px) without `max-width: 100%`.
  - Caused by unconstrained 6-column data table width (638.58px).
- **Controls `#name` and `#comment`**:
  - Located at `right: 628.58px`, far outside the 360px mobile viewport.
  - Severely clipped on narrow screens.
  - Labels were unassociated text strings inside `.flex-pair`.
- **Navigation & Layout**:
  - Flex navigation with fixed height (50px) squished links and search input.
  - Side-by-side flex layout for `article` and `.secondary` crammed content into unreadable widths.

### 2. Viewport 1280×800 (Desktop)
- **Document scrollWidth**: 1280px.
- **Horizontal Overflow**: None (0px).
- **Controls `#name` and `#comment`**: Fully visible within viewport (`right: 756.58px`).
- **Layout**: Two-column layout functioned as designed for desktop screens.

## Required Remediation
1. Replace fixed `min-width: 1024px` on `body` with fluid, max-width responsive rules.
2. Ensure responsive scaling for media (`img { max-width: 100%; height: auto; }` and `audio { width: 100%; max-width: 500px; }`).
3. Wrap multi-column data table in an intentionally scrollable container (`.table-container`) with `role="region"`, `aria-label="Bear types and facts"`, and `tabindex="0"`.
4. Add media query (`@media (max-width: 768px)`) to stack navigation, article, and related links vertically while maintaining natural reading order.
5. Provide `<label>` association and responsive vertical stacking for `#name` and `#comment` controls so they remain unclipped and within the 360px viewport.
6. Provide Playwright regression test suite (`tests/course/r18-t052.mjs`) verifying both viewports, control clipping, content order, intentional scroll regions, form interactions, and mutation checks.
