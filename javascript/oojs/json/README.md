# JSON superheroes example

`heroes.html` is the starter page for the JSON exercise. Its empty `section` is
the region the lesson's JavaScript populates. The example is static: it has no
animations or transitions, so reduced-motion preferences do not remove or
change any content.

The page provides a keyboard skip link to the heroes region, with a visible
focus indicator. Its content container also fits narrow viewports.

## Run the browser regression

From the repository root, install the locked test dependency once with
`npm install`, then run:

```sh
node tests/course/r18-t029.mjs
```

The check serves the example locally and verifies reduced-motion behavior,
keyboard navigation/focus, and the static layout at narrow and desktop widths.
