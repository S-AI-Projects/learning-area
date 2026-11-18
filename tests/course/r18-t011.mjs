import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const workDir = path.resolve(repoRoot, 'work/R18-T011');
fs.mkdirSync(workDir, { recursive: true });

const PORT = process.env.TEST_PORT ? parseInt(process.env.TEST_PORT, 10) : 8000;
const PAGE_REL_PATH = 'tools-testing/cross-browser-testing/accessibility/bad-semantics.html';
const TARGET_URL = `http://127.0.0.1:${PORT}/${PAGE_REL_PATH}`;

async function pollServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await new Promise((resolve) => {
        const req = http.get(url, (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(1000, () => {
          req.destroy();
          resolve(false);
        });
      });
      if (ok) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for server at ${url}`);
}

async function startServer() {
  console.log(`Starting documented local server (python3 -m http.server ${PORT}) from ${repoRoot}...`);
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  server.on('error', (err) => {
    console.error('Failed to start Python HTTP server:', err);
  });

  await pollServer(TARGET_URL);
  console.log(`Local server is ready at ${TARGET_URL}`);
  return server;
}

async function run() {
  const inputs = {
    url: TARGET_URL,
    port: PORT,
    document: PAGE_REL_PATH,
    actions: ['load', 'tab_to_skip_link', 'activate_via_enter'],
    assertions: [
      'rendered_dom_structure',
      'teaching_purpose_retained',
      'unfocused_computed_layout_unchanged',
      'tab_traversal_focuses_skip_link',
      'visible_focus_computed_styling',
      'keyboard_activation_hash_and_focus'
    ]
  };
  fs.writeFileSync(path.join(workDir, 'inputs.json'), JSON.stringify(inputs, null, 2), 'utf-8');

  let playwrightModule;
  try {
    playwrightModule = await import('playwright');
  } catch (err) {
    console.error('Playwright could not be loaded:', err.message);
    throw err;
  }

  const { chromium } = playwrightModule;
  let serverProcess = null;
  let browser = null;
  let context = null;
  const checks = [];

  function recordCheck(name, expected, actual, pass, details = {}) {
    checks.push({ name, expected, actual, pass, details });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}`);
  }

  try {
    serverProcess = await startServer();

    browser = await chromium.launch({ headless: true });
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    const page = await context.newPage();

    console.log(`Navigating to ${TARGET_URL}...`);
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });

    // 1. DOM Structure & Teaching Purpose
    const pageTitle = await page.title();
    assert.equal(pageTitle, 'Bad semantics example', 'Page title must match');
    recordCheck('Page Title', 'Bad semantics example', pageTitle, true);

    const skipLinkCount = await page.locator('a.skip-link').count();
    assert.equal(skipLinkCount, 1, 'Exactly one skip link anchor must exist');
    recordCheck('Skip Link Presence', 1, skipLinkCount, true);

    const skipLinkHref = await page.locator('a.skip-link').getAttribute('href');
    assert.equal(skipLinkHref, '#main', 'Skip link href must target #main');
    recordCheck('Skip Link Href', '#main', skipLinkHref, true);

    const mainCount = await page.locator('#main').count();
    assert.equal(mainCount, 1, 'Main content region with id="main" must exist');
    recordCheck('Main Target Presence', 1, mainCount, true);

    const fontCount = await page.locator('font[size="7"]').count();
    assert.equal(fontCount, 1, 'Original <font size="7"> heading must be preserved for teaching purpose');
    recordCheck('Original Heading Retained', 1, fontCount, true);

    // 2. Unfocused Computed Layout (CSS behavior unchanged)
    const unfocusedHeadingBox = await page.locator('font[size="7"]').boundingBox();
    assert.ok(unfocusedHeadingBox, 'Heading must have bounding box');
    assert.ok(unfocusedHeadingBox.y <= 30, `Heading y-position (${unfocusedHeadingBox.y}) must be near top, unaffected by skip link`);
    recordCheck('Unfocused Heading Layout', '<= 30px', `${unfocusedHeadingBox.y}px`, true);

    const unfocusedSkipLinkBox = await page.locator('a.skip-link').boundingBox();
    const isVisuallyHidden = !unfocusedSkipLinkBox || unfocusedSkipLinkBox.y < 0 || unfocusedSkipLinkBox.width <= 1;
    assert.ok(isVisuallyHidden, 'Skip link must be visually hidden/off-screen before focus');
    recordCheck('Unfocused Skip Link Off-screen', true, isVisuallyHidden, true, { box: unfocusedSkipLinkBox });

    await page.screenshot({ path: path.join(workDir, 'unfocused.png') });

    // 3. Tab Traversal
    await page.locator('body').focus();
    await page.keyboard.press('Tab');

    const activeTagName = await page.evaluate(() => document.activeElement?.tagName);
    const activeClassName = await page.evaluate(() => document.activeElement?.className);
    assert.equal(activeTagName, 'A', 'Tab key must focus the skip link anchor');
    assert.ok(activeClassName.includes('skip-link'), 'Active element must have class skip-link');
    recordCheck('Tab Traversal Active Element', 'A.skip-link', `${activeTagName}.${activeClassName}`, true);

    // 4. Visible Focus & Computed Styles
    const focusedBox = await page.locator('a.skip-link').boundingBox();
    assert.ok(focusedBox, 'Focused skip link must have bounding box');
    assert.ok(focusedBox.y >= 0, `Focused skip link y (${focusedBox.y}) must be visible in viewport`);
    assert.ok(focusedBox.x >= 0, `Focused skip link x (${focusedBox.x}) must be visible in viewport`);
    assert.ok(focusedBox.width > 20, `Focused skip link width (${focusedBox.width}) must be visible`);
    assert.ok(focusedBox.height > 10, `Focused skip link height (${focusedBox.height}) must be visible`);
    recordCheck('Focused Visible Bounding Box', 'Visible on screen', `${Math.round(focusedBox.width)}x${Math.round(focusedBox.height)} at (${Math.round(focusedBox.x)}, ${Math.round(focusedBox.y)})`, true);

    const focusedStyles = await page.locator('a.skip-link').evaluate((el) => {
      const s = window.getComputedStyle(el);
      return {
        visibility: s.visibility,
        display: s.display,
        outlineStyle: s.outlineStyle,
        outlineWidth: s.outlineWidth,
        outlineColor: s.outlineColor,
        borderStyle: s.borderStyle,
        backgroundColor: s.backgroundColor,
        color: s.color
      };
    });
    assert.notEqual(focusedStyles.visibility, 'hidden', 'Focused link must be visible');
    assert.notEqual(focusedStyles.display, 'none', 'Focused link display must not be none');
    assert.ok(
      focusedStyles.outlineStyle !== 'none' || focusedStyles.borderStyle !== 'none',
      'Focused link must have visible outline or border for accessibility'
    );
    recordCheck('Visible Focus Outline/Border', 'Visible outline or border', `outline: ${focusedStyles.outlineStyle}, border: ${focusedStyles.borderStyle}`, true, focusedStyles);

    await page.screenshot({ path: path.join(workDir, 'focused.png') });

    // 5. Keyboard Activation
    await page.keyboard.press('Enter');

    const urlAfterEnter = page.url();
    assert.ok(urlAfterEnter.endsWith('#main'), `URL hash must update to #main, got: ${urlAfterEnter}`);
    recordCheck('Keyboard Activation URL Hash', '#main', new URL(urlAfterEnter).hash, true);

    const activeIdAfterEnter = await page.evaluate(() => document.activeElement?.id);
    assert.equal(activeIdAfterEnter, 'main', 'Active element after activating skip link must be #main');
    recordCheck('Keyboard Activation Target Focus', 'main', activeIdAfterEnter, true);

    await page.screenshot({ path: path.join(workDir, 'activated.png') });

    // Record tool versions
    const toolVersions = {
      node: process.version,
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      playwright: playwrightModule?.version || 'installed',
      chromium: browser.version()
    };
    fs.writeFileSync(path.join(workDir, 'tool-versions.json'), JSON.stringify(toolVersions, null, 2), 'utf-8');

    // Record expected vs actual
    fs.writeFileSync(path.join(workDir, 'expected-vs-actual.json'), JSON.stringify(checks, null, 2), 'utf-8');

    console.log(`\nAll ${checks.length} checks passed successfully.`);
  } catch (error) {
    console.error('Test execution failed:', error);
    fs.writeFileSync(path.join(workDir, 'error.log'), `${error.stack || error.message}\n`, 'utf-8');
    throw error;
  } finally {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    if (serverProcess) {
      console.log('Stopping local server...');
      serverProcess.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 200));
      serverProcess.kill('SIGKILL');
    }
  }
}

run().then(
  () => {
    process.exit(0);
  },
  (err) => {
    console.error('FAILURE:', err.message);
    process.exit(1);
  }
);
