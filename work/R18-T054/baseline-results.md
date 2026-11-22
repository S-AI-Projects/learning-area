# R18-T054 Baseline Observations

## Target Page
`html/forms/custom-radio-styles/index.html`

## Source Anchors
- `form`: `<form>` containing the custom radio group
- `input`: `<input type="radio" name="fruit" value="...">` (3 radio options: cherry, banana, strawberry)

## Baseline State Inspection

1. **Static Markup & Styling**:
   - The page contains pure HTML and CSS demonstrating custom-styled radio buttons (`appearance: none;` with `::before` pseudo-element check indicators).
   - The page contains no inline or external scripts, timers, or custom event listeners.
2. **Repeated Initialization**:
   - Loading the page repeatedly maintains exactly 1 `<form>`, 1 `<fieldset>`, 1 `<legend>`, and 3 `<input type="radio">` elements.
   - No nodes are duplicated.
3. **Repeated Interactions**:
   - Checking "cherry" marks it checked.
   - Checking "banana" unchecks "cherry" and checks "banana" (native mutual exclusivity).
   - Checking "cherry" again preserves mutual exclusivity without duplicate state or DOM mutations.
4. **Isolated Lifecycle Harness Requirement**:
   - For static demo pages, the requirement specifies testing repeated style/demo toggles in an isolated harness.
   - The harness must verify that repeated `init()` calls replace/reset handlers and timers rather than duplicating them.
   - The harness must verify that cleanup leaves zero active timers or event listeners.
