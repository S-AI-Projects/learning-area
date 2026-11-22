# R18-T060 — Baseline Results

## Task
**Interaction regression** for `css/css-layout/legacy/html-skeleton-finished.html`  
**Source anchors**: Main rendered content region (`.container > .row` grid)

## Baseline Behavior (Before Changes)

### Page Structure
- One `.container` element (max-width: 960px, centered)
- Two `.row` children:
  - **Row 1**: 12 × `.one.column` cells (numbered 1–12)
  - **Row 2**: 4 cells — `.one.column` (13), `.six.columns` (14), `.three.columns` (15), `.two.columns` (16)

### Grid Layout Analysis (at 1200px viewport)

| Element | CSS Class | Measured Width (% of row) | Expected |
|---------|-----------|--------------------------|----------|
| Cell 14 | `.six.columns` | 48.00% | 48% |
| Cell 15 | `.three.columns` | 22.00% | 22% |
| Cell 16 | `.two.columns` | 13.33% | 13.33% |
| Cell 1–12 | `.one.column` | 4.67% each | 4.67% |

All column elements have `float: left` applied by `skeleton.css`.

### Deliberate-Break Fixture

| Injected style | Effect | Measured |
|----------------|--------|----------|
| `.column, .columns { float: none !important; width: 100% !important; }` | Grid collapses to stacked blocks | `.six.columns` → 100% of row |

After removing the fixture, `float: left` is correctly restored.

## Environment
- Node.js: v26.13.0
- Playwright: 1.65.1
- Chromium: Playwright bundled
- OS: macOS
- Date: 2026-11-23
