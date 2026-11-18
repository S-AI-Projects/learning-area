 # Image Input: X and Y Coordinates

This example demonstrates an HTML image input (`type="image"`), which submits the coordinates of the position clicked by the user.

## Repeat Initialization Test

Run the regression test from the repository root:

```bash
node tests/course/r18-t004.mjs
```

The test checks that:

- The original image input loads and has visible layout.
- Repeated demo initialization does not create duplicate elements.
- Repeated toggles produce exactly one update per click.
- Cleanup removes generated elements and disables the event listener.
- No unexpected browser errors occur.

The test uses an isolated browser harness. It does not modify the original example's behaviour.