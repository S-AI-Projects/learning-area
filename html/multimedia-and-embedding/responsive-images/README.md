# Responsive images example

This example demonstrates responsive image selection using HTML
`picture`, `source`, `srcset`, and `sizes`.

## Browser regression test

From the repository root, run:

    npm install
    npx playwright install chromium
    node tests/course/r18-t042.mjs

The test checks responsive image selection, image loading, missing-image
behavior, alternative text, recovery, layout, and the image-credit link.

Evidence is saved in `work/R18-T042/`.
