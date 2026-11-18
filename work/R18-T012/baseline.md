# Baseline & Responsive Accessibility Analysis: `assessment-start/index.html`

## Target Page
- **Path**: `accessibility/assessment-start/index.html`
- **Linked Stylesheet**: `accessibility/assessment-start/style.css`
- **Linked Script**: `accessibility/assessment-start/main.js`
- **Source Anchors**: `#name`, `#comment`

---

## 1. Baseline Inspection (Before Editing)

### A. Viewport at 360×800 (Mobile)
1. **Unintended Horizontal Page Overflow**:
   - In `style.css`:
     ```css
     body {
       width: 80%;
       min-width: 1024px;
       margin: 0 auto;
     }
     ```
     The `min-width: 1024px` property forced the document body to be at least 1024px wide on a 360px viewport, resulting in severe horizontal page scroll (`scrollWidth = 1024px`, exceeding the viewport by 664px).
   - Content images (`wild-bear.jpg`, `urban-bear.jpg`) have intrinsic widths of 500px with no `max-width: 100%`, protruding 140px past the viewport.
   - Audio element (`<audio controls>`) had a fixed width of `500px`, also overflowing the 360px screen.
   - Navigation bar (`div[class="nav"]`) had a fixed `height: 50px` with horizontal flex items, causing links and the search input to clip and overflow.
2. **Clipped Controls & Usability (#name, #comment)**:
   - In `index.html`, the comment form labels `"Your name:"` and `"Your comment:"` were bare text nodes rather than `<label for="...">` elements, preventing programmatic association.
   - `.comment-form .flex-pair` had `padding: 0 3rem 1rem` and kept label and input on a single horizontal flex line. On a 360px screen, this compressed the input fields into narrow, barely usable boxes.
   - The submit button was set to `width: 30%`, which at ~250px container width resulted in a ~75px wide button that clipped the `"Submit comment"` text.
3. **Content Order**:
   - `main` was styled with `display: flex`, forcing `article` (flex: 5) and `.secondary` (flex: 2) into parallel side-by-side columns even on mobile, creating two narrow columns instead of a natural vertical stack.
4. **Data Table (Bear facts table)**:
   - The 6-column table (`Bear Type`, `Coat`, `Adult size`, `Habitat`, `Lifespan`, `Diet`) was placed directly in `<article>` without a designated horizontal scroll container, causing unstyled text wrapping and cell collision.

---

### B. Viewport at 1280×800 (Desktop)
1. **Usability**:
   - The desktop layout rendered with adequate space (`width: 80%`, ~1024px wide).
   - Two-column layout (`article` and `.secondary` side-by-side) worked as intended.
   - Form inputs were usable, though still lacking accessible `<label for="...">` markup.

---

## 2. Changed Behavior (After Responsive & Accessibility Remediation)

1. **Elimination of Unintended Horizontal Overflow**:
   - Added global `box-sizing: border-box`.
   - Adjusted `body` to `width: 90%; max-width: 1200px;` with `min-width: 1024px` scoped exclusively to `@media (min-width: 1024px)`.
   - Added `max-width: 100%; height: auto;` to images.
   - Added `width: 100%; max-width: 500px;` to audio elements.
   - Made navigation responsive with `flex-wrap: wrap` and `min-height: 50px`.
   - **Result**: `scrollWidth <= innerWidth` across both 360×800 and 1280×800 viewports.
2. **Intentionally Scrollable Demonstration (Data Table)**:
   - Encapsulated the table within `<div class="table-container" role="region" aria-label="Bear facts table" tabindex="0">`.
   - Styled with `overflow-x: auto; width: 100%; -webkit-overflow-scrolling: touch;`.
   - **Result**: The table provides intentional, labelled horizontal scrolling with keyboard support (`tabindex="0"`) on mobile, while the page itself remains locked to vertical scrolling.
3. **Optimized Mobile Content Order**:
   - Scoped `main { display: flex; flex-direction: column; }` for mobile viewports, ensuring `article` displays first, followed by `.secondary`.
   - Applied `flex-direction: row` inside `@media (min-width: 768px)` to preserve the desktop side-by-side layout.
4. **Unclipped Controls & Accessible Labels (#name, #comment)**:
   - Replaced bare text with semantic `<label for="name">` and `<label for="comment">`.
   - Added responsive `@media (max-width: 600px)` rules to `.comment-form .flex-pair` to stack labels above inputs, giving inputs full width (`width: 100%`).
   - Adjusted submit button to `min-width: 140px; width: 100%; max-width: 200px;` on mobile, preventing text clipping.
   - Upgraded `.show-hide` to `<button type="button" class="show-hide">` for native keyboard accessibility.
5. **Hardware/Permission Isolation**:
   - Media playback (`HTMLMediaElement.prototype.play`) is stubbed during automated testing to isolate regression checks from device audio hardware.
