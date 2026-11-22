# Video Audio Custom Player — Error & Empty State Handling

This directory contains the custom video player example demonstrating HTML5 `<video>` manipulation, custom controls, and graceful error and fallback states.

## Empty and Error State Handling

- **Missing / Failed Video Media**:
  - When media assets fail to load or network requests fail, a readable status alert (`.media-error-msg`) is displayed with a direct link to the media source.
  - Interactive player controls (`play`, `stop`, `rwd`, `fwd`) are safely disabled, preventing uncaught errors.
  - Native `<p class="video-fallback">` content is available inside the `<video>` element for unsupporting environments.
- **Media Recovery**:
  - When a valid video source is loaded or restored, the player automatically clears the alert banner and re-enables custom controls.
- **Icon Font Fallback**:
  - The custom buttons declare `font-family: HeydingsControlsRegular, sans-serif;` with `aria-label` attributes to ensure controls remain readable and accessible even when custom font assets fail to download.
- **Static Empty Fixture**:
  - `fixtures/video-empty.html` provides a verified static fixture representing an empty video container with no sources.

---

## Automated Regression Testing

The test suite validates:
1. Baseline media loading, controls visibility, and playback interactions.
2. Failed asset fallback display and control disabling without uncaught exceptions.
3. Media recovery when valid media input is supplied.
4. Static empty fixture verification.
5. Missing icon font fallback legibility.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Playwright](https://playwright.dev/) with Chromium installed

### Setup

From the repository root:

```bash
npm install
npx playwright install chromium
```

### Run the Test

From the repository root:

```bash
node tests/course/r18-t053.mjs
```

Or via npm:

```bash
npm test
```

