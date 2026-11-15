# R18-T052 Expected vs Actual Results

## Test Matrix

| Test Case | Viewport | Expected Result | Actual Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Document Horizontal Overflow** | 360×800 | `document.documentElement.scrollWidth <= 360px` | `scrollWidth = 360px` (0px overflow) | PASS |
| **Document Horizontal Overflow** | 1280×800 | `document.documentElement.scrollWidth <= 1280px` | `scrollWidth = 1280px` (0px overflow) | PASS |
| **Body Width Constraint** | 360×800 | `document.body.scrollWidth <= 360px` | `bodyWidth = 360px` | PASS |
| **Body Width Constraint** | 1280×800 | `document.body.scrollWidth <= 1280px` | `bodyWidth = 1024px` | PASS |
| **Content Reading Order** | 360×800 | Main `<article>` visually precedes `<div class="secondary">` | `article.top < secondary.top` | PASS |
| **Content Reading Order** | 1280×800 | Main `<article>` precedes `.secondary` in DOM order | `followsInDom = true` | PASS |
| **Intentional Scroll Region** | Both | Table wrapped in `.table-container` with `role="region"`, `aria-label`, `tabindex="0"` | Container exists, labeled, and focusable | PASS |
| **Media Bounds (Images)** | 360×800 | `img.right <= 360px` | `img.right = 326.98px` | PASS |
| **Media Bounds (Audio)** | 360×800 | `audio.right <= 360px` | `audio.right = 327px` | PASS |
| **Control Clipping (#name)** | 360×800 | `0 <= name.x < name.right <= 360px` | `x = 53px, right = 307px` | PASS |
| **Control Clipping (#comment)**| 360×800 | `0 <= comment.x < comment.right <= 360px` | `x = 53px, right = 307px` | PASS |
| **Control Clipping (#name)** | 1280×800 | `0 <= name.x < name.right <= 1280px` | `x = 343.14px, right = 756.58px` | PASS |
| **Control Clipping (#comment)**| 1280×800 | `0 <= comment.x < comment.right <= 1280px` | `x = 343.14px, right = 756.58px` | PASS |
| **Comment Form Submission** | 360×800 | Form submits, creates `li` in comment container, clears inputs | New comment rendered, `#name` & `#comment` cleared | PASS |
| **Comment Form Submission** | 1280×800 | Form submits, creates `li` in comment container, clears inputs | New comment rendered, `#name` & `#comment` cleared | PASS |
| **Unexpected Errors** | Both | 0 page errors, 0 console errors | 0 errors detected | PASS |
| **Mutation Test Detection** | 360×800 | Deliberate `min-width: 1600px` mutation triggers overflow assertion | Assertion correctly caught and passed | PASS |
