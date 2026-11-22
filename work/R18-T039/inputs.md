# R18-T039 Inputs

## Target Page
`html/forms/toggle-switch-example/index.html`

## Source Anchor
`#power` (`<input type="checkbox" name="power" id="power">`)

## Tested Viewport Widths
| Viewport Name | Width | Height |
|---|---|---|
| Mobile | 390px | 844px |
| Desktop | 1280px | 800px |

## Motion Preferences Tested
- `reducedMotion: 'no-preference'` (standard transition duration 0.4s)
- `reducedMotion: 'reduce'` (disabled transition duration 0s)

## Interaction Verification
1. **Keyboard navigation**: Tab key navigation to `#power` asserting focus ring visibility (`outlineStyle: solid`, `outlineWidth: 2px`, `outlineOffset: 2px`).
2. **Keyboard activation**: Space key press toggling `#power` state (`checked = true`), updating background color to `rgb(255, 170, 0)`, and switching label text visibility (`.on` opacity 1, `.off` opacity 0).
3. **Layout containment**: Bounding box assertions ensuring focus indicators and toggle switch remain completely within viewport boundaries at both widths.
