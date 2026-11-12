# R18-T049 Evidence

## Baseline
- Original lesson passed.
- Instructional paragraph and documentation link are visible.
- Correct MDN destination verified.
- Computed layout and pointer interaction verified.
- Link click and navigation verified using a locally intercepted response.

## Deliberate CSS mutation
- Temporary fixture applies `pointer-events: none` to the link.
- The test detects the incorrect computed style.
- Expected pointer-events: auto.
- Actual pointer-events: none.
- The assertion fails for the intended reason.

## Safety
- Mutation is applied only to a temporary fixture.
- Original lesson remains unchanged.
- Temporary fixture is removed after testing.

## Tools
- Node: v26.8.1
- npm: 11.19.0
- Playwright: 1.65.0
- Chromium: 158.0.8127.18

## Run
`node tests/course/r18-t049.mjs`
