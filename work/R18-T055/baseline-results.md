# Baseline Analysis: Document Manipulation Example (R18-T055)

## Target Page
`javascript/apis/document-manipulation/dom-example.html`

## Source Anchors
- `img` (`dinosaur.png`)
- `a` (`https://www.mozilla.org/`)

## Baseline Inspection
The target file `javascript/apis/document-manipulation/dom-example.html` is an introductory starter HTML document for the Document Object Model (DOM) manipulation lesson in MDN learning area.

### Source Code
```html
<!DOCTYPE html>
<html lang="en-US">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simple DOM example</title>
  </head>
  <body>
      <section>
        <img src="dinosaur.png" alt="A red Tyrannosaurus Rex: A two legged dinosaur standing upright like a human, with small arms, and a large head with lots of sharp teeth.">
        <p>Here we will add a link to the <a href="https://www.mozilla.org/">Mozilla homepage</a></p>
      </section>
  </body>
</html>
```

### Initial Observations
1. **Document Structure**:
   - `lang`: `en-US`
   - `title`: `Simple DOM example`
   - `meta charset`: `utf-8`
   - `meta viewport`: `width=device-width, initial-scale=1.0`
   - Zero embedded or external scripts (`<script>` count = 0).
   - Zero external stylesheets or style elements (`<link rel="stylesheet">` count = 0, `<style>` count = 0).
2. **Anchored Image Element (`<img>`)**:
   - Relative `src`: `dinosaur.png`
   - Natural dimensions: 240 x 210 pixels.
   - Descriptive `alt`: `"A red Tyrannosaurus Rex: A two legged dinosaur standing upright like a human, with small arms, and a large head with lots of sharp teeth."`
   - In standard browser rendering without custom CSS, the image renders at its intrinsic dimensions (240x210).
3. **Anchored Link Element (`<a>`)**:
   - Destination `href`: `https://www.mozilla.org/`
   - Link text: `"Mozilla homepage"`
   - Parent element: `<p>` inside `<section>`.
   - Paragraph text: `"Here we will add a link to the Mozilla homepage"`
4. **Behavioral Characteristics**:
   - The document is static and does not depend on dynamic runtime behavior or public APIs.
   - For deterministic automated verification across fresh browser contexts, viewport dimensions must be locked (1280x800) and external network requests blocked to ensure offline independence.
