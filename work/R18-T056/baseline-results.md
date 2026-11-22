# Baseline Analysis: HTML Table Basics (R18-T056)

## Target Page
`html/tables/basic/blank-template.html`

## Source Anchors
- The main rendered content region (`#main-content`, `table`, fallback container)

## Baseline State Before Changes
1. **Original HTML (`blank-template.html`)**:
   - Contained `<title>Table template</title>`, `<link href="minimal-table.css" rel="stylesheet" type="text/css">`, and an `<h1>Table template</h1>` element.
   - The body area beneath `<h1>` was blank boilerplate intended for students to manually add table markup during the MDN tutorial.
   - No explicit progressive enhancement or fallback notice existed if advanced CSS table features or scripts were unsupported.
2. **Original CSS (`minimal-table.css`)**:
   - Included rules for `table`, `th`, `td`, `tr:nth-child(even)`, `tr:nth-child(odd)`, and `caption`.
   - Used space-separated CSS Color Module Level 4 notations like `rgb(200 200 200)` and `border-collapse: collapse` without explicit fallback declarations or feature queries.
3. **Teaching Purpose & Behavior**:
   - The purpose is to provide a clean, accessible starter template for learning HTML table structure and CSS presentation.
   - To make the template robust across diverse browser environments, it requires explicit progressive enhancement: cascading color fallbacks, `@supports` feature queries, and a clear fallback status notification when modern CSS table styling is unavailable.
