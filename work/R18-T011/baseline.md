# Baseline Accessibility Analysis: `bad-semantics.html`

## Target Page
- **Path**: `tools-testing/cross-browser-testing/accessibility/bad-semantics.html`
- **Title**: "Bad semantics example"

## Inspection of Linked Scripts and Styles
- **External Stylesheets**: None. There are no `<link rel="stylesheet">` elements.
- **External/Inline Scripts**: None. There are no `<script>` tags.
- **Inline Styles**: None. Formatting is achieved using obsolete HTML tags (`<font size="7">`, `<font size="5">`, `<br><br>`).

## Teaching Purpose of the Example
The example is part of MDN's cross-browser accessibility module demonstrating bad semantic practices:
1. Using `<font size="7">` and `<font size="5">` to emulate headings rather than semantic `<h1>` and `<h2>`.
2. Using multiple `<br><br>` line breaks to emulate paragraphs rather than `<p>` tags.
3. Lack of semantic landmarks (`<header>`, `<main>`, `<nav>`, `<footer>`).
To preserve the document's educational purpose, this non-semantic demonstration must remain intact; replacing the `<font>` tags with `<h1>` would destroy the example's purpose (as `good-semantics.html` provides the contrasting good example).

## Baseline Interactive Behavior
1. **Interactive Controls**:
   - Total interactive controls (`<a>`, `<button>`, `<input>`, `<select>`, `<textarea>`, `[tabindex]`): `0`.
   - The document is completely static text.
2. **Keyboard Tab Traversal**:
   - Pressing `Tab` does not focus any element on the page.
   - `document.activeElement` remains `<body>`.
3. **Landmark Navigation / Skip Links**:
   - No skip-to-content mechanism exists.
   - Screen reader users and keyboard-only users cannot bypass headers or jump directly to the main content region.
4. **Main Rendered Content Region**:
   - The main rendered content region begins at the heading `"My heading"` (`<font size="7">`) and encompasses the three document sections.

## Target Accessibility Enhancement
- Add a **skip-to-content** source anchor (`<a class="skip-link" href="#main">Skip to main content</a>`).
- Identify and wrap the main rendered content region with `<main id="main" tabindex="-1">`.
- Use accessible styling that keeps the skip link visually hidden and out of the document flow when unfocused, ensuring the demonstrated CSS behavior and baseline visual presentation are unchanged.
- On `Tab` focus, the skip link becomes visibly prominent with high contrast and focus outline.
- On keyboard activation (`Enter`), navigation moves directly to `#main`, updating the URL hash and focusing the main content target.
