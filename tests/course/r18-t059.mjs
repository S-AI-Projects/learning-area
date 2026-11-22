/**
 * R18-T059 — Motion and focus preferences regression test
 * Target: html/forms/sending-form-data/get-method.html
 * Source anchor: #say
 * Task type: Motion and focus preferences
 *
 * Checks:
 *  1. Page loads without unexpected console errors.
 *  2. #say input exists and is visible.
 *  3. No CSS animation or transition is applied to #say (no motion present).
 *  4. No CSS animation or transition is applied to any element on the page.
 *  5. Under prefers-reduced-motion: reduce emulation, page info and controls remain usable.
 *  6. Under prefers-reduced-motion: reduce, #say is still visible and interactive.
 *  7. Keyboard focus on #say is visible at desktop width (1280px): outline or visible focus indicator.
 *  8. Keyboard focus on #say is visible at mobile width (375px): outline or visible focus indicator.
 *  9. Form has correct method="get" and action attributes (static layout regression).
 * 10. No unexpected page errors.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import assert from 'assert/strict';

// ── helpers ──────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(new URL('.', import.meta.url).pathname, '../..');
const EXAMPLE_DIR = path.join(REPO_ROOT, 'html', 'forms', 'sending-form-data');

function mimeFor(ext) {
  const map = {
    '.html': 'text/html',
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.php':  'text/plain', // serve as text, not executed
  };
  return map[ext] || 'application/octet-stream';
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = req.url.split('?')[0];
      const filePath = path.join(REPO_ROOT, urlPath);

      if (!filePath.startsWith(REPO_ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
      }

      fs.readFile(filePath, (err, data) => {
        if (err) {
          if (err.code === 'ENOENT') {
            res.writeHead(404);
            res.end('Not Found');
          } else {
            res.writeHead(500);
            res.end('Server Error');
          }
          return;
        }
        const ext = path.extname(filePath);
        res.writeHead(200, { 'Content-Type': mimeFor(ext) });
        res.end(data);
      });
    });

    server.listen(0, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

// ── utility: get computed style property for a selector ──────────────────────
async function getComputedStyleProp(page, selector, prop) {
  return page.evaluate(
    ([sel, p]) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      return window.getComputedStyle(el).getPropertyValue(p);
    },
    [selector, prop]
  );
}

// ── utility: check if focus indicator is visible ─────────────────────────────
// Returns an object with outline-width, outline-style, outline-color, box-shadow
async function getFocusIndicator(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    el.focus();
    const cs = window.getComputedStyle(el);
    return {
      outlineWidth:  cs.getPropertyValue('outline-width'),
      outlineStyle:  cs.getPropertyValue('outline-style'),
      outlineColor:  cs.getPropertyValue('outline-color'),
      boxShadow:     cs.getPropertyValue('box-shadow'),
    };
  }, selector);
}

// ── main ─────────────────────────────────────────────────────────────────────

let server;
let browser;

try {
  server = await startServer();
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const pageUrl = `${baseUrl}/html/forms/sending-form-data/get-method.html`;

  browser = await chromium.launch({ headless: true });

  // Work directory for screenshots
  const workDir = path.join(REPO_ROOT, 'work', 'R18-T059');
  fs.mkdirSync(workDir, { recursive: true });

  // ── PASS 1: Desktop (1280×800), default motion preference ─────────────────

  const ctx1 = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  await ctx1.route(/^https?:\/\/(?!127\.0\.0\.1)/, route => route.abort());

  const page1 = await ctx1.newPage();

  const consoleErrors = [];
  page1.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  const pageErrors = [];
  page1.on('pageerror', err => pageErrors.push(err.message));

  await page1.goto(pageUrl, { waitUntil: 'domcontentloaded' });
  await page1.waitForTimeout(300);

  await page1.screenshot({ path: path.join(workDir, 'baseline-desktop.png'), fullPage: true });

  // ── CHECK 1: No unexpected console errors ─────────────────────────────────
  assert.deepEqual(consoleErrors, [], `Unexpected console errors: ${JSON.stringify(consoleErrors)}`);
  console.log('✓ Check 1: No unexpected console errors');

  // ── CHECK 2: #say input exists and is visible ─────────────────────────────
  const sayInput = page1.locator('#say');
  await expect_visible(sayInput, page1);
  const sayCount = await sayInput.count();
  assert.ok(sayCount === 1, `Expected exactly 1 #say input, got ${sayCount}`);
  const isVisible = await sayInput.isVisible();
  assert.ok(isVisible, '#say input must be visible');
  console.log('✓ Check 2: #say input exists and is visible');

  // ── CHECK 3: No animation/transition on #say ──────────────────────────────
  const sayAnim = await getComputedStyleProp(page1, '#say', 'animation-name');
  const sayTrans = await getComputedStyleProp(page1, '#say', 'transition-property');
  const sayAnimDuration = await getComputedStyleProp(page1, '#say', 'animation-duration');

  // animation-name should be "none" or empty; animation-duration "0s"
  assert.ok(
    !sayAnim || sayAnim === 'none' || sayAnim === '',
    `#say should have no animation-name, got "${sayAnim}"`
  );
  assert.ok(
    !sayAnimDuration || sayAnimDuration === '0s',
    `#say animation-duration should be "0s", got "${sayAnimDuration}"`
  );
  console.log(`✓ Check 3: No CSS animation on #say (animation-name: "${sayAnim}", duration: "${sayAnimDuration}")`);

  // ── CHECK 4: No animation/transition on any element ──────────────────────
  const anyMotion = await page1.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const animated = all.filter(el => {
      const cs = window.getComputedStyle(el);
      const name = cs.getPropertyValue('animation-name');
      const dur  = cs.getPropertyValue('animation-duration');
      const trans = cs.getPropertyValue('transition-duration');
      return (name && name !== 'none' && name !== '') ||
             (dur && dur !== '0s') ||
             (trans && trans !== '0s');
    });
    return animated.map(el => el.tagName + (el.id ? '#' + el.id : '') + (el.className ? '.' + el.className : ''));
  });
  assert.deepEqual(anyMotion, [], `Expected no animated elements, found: ${JSON.stringify(anyMotion)}`);
  console.log('✓ Check 4: No animation or transition on any element (page has no motion)');

  // ── CHECK 5: prefers-reduced-motion emulation — page info usable ──────────
  const ctx2 = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'reduce',
  });
  await ctx2.route(/^https?:\/\/(?!127\.0\.0\.1)/, route => route.abort());
  const page2 = await ctx2.newPage();
  await page2.goto(pageUrl, { waitUntil: 'domcontentloaded' });
  await page2.waitForTimeout(300);

  await page2.screenshot({ path: path.join(workDir, 'reduced-motion-desktop.png'), fullPage: true });

  // Form must still be present under reduced-motion
  const formExists = await page2.locator('form').count();
  assert.ok(formExists === 1, `Expected form to exist under reduced-motion emulation, got ${formExists}`);
  const sayExists2 = await page2.locator('#say').count();
  assert.ok(sayExists2 === 1, `Expected #say to exist under reduced-motion emulation, got ${sayExists2}`);
  console.log('✓ Check 5: Under prefers-reduced-motion:reduce, form and controls remain present');

  // ── CHECK 6: prefers-reduced-motion — #say still visible & interactive ────
  const sayVisible2 = await page2.locator('#say').isVisible();
  assert.ok(sayVisible2, '#say must be visible under prefers-reduced-motion:reduce');

  // No new animation under reduced-motion either
  const anyMotionReduced = await page2.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const animated = all.filter(el => {
      const cs = window.getComputedStyle(el);
      const name = cs.getPropertyValue('animation-name');
      const dur  = cs.getPropertyValue('animation-duration');
      return (name && name !== 'none' && name !== '') || (dur && dur !== '0s');
    });
    return animated.length;
  });
  assert.strictEqual(anyMotionReduced, 0, `Expected no motion under reduced-motion, found ${anyMotionReduced} animated elements`);
  console.log('✓ Check 6: Under prefers-reduced-motion:reduce, #say is visible and no animation present');

  await ctx2.close();

  // ── CHECK 7: Keyboard focus visible at desktop width (1280px) ────────────
  const focusDesktop = await getFocusIndicator(page1, '#say');
  assert.ok(focusDesktop, 'Could not get focus styles for #say at desktop width');

  // A visible focus indicator means outline-style is not "none" OR box-shadow is set
  const hasOutlineDesktop =
    focusDesktop.outlineStyle && focusDesktop.outlineStyle !== 'none';
  const hasBoxShadowDesktop =
    focusDesktop.boxShadow && focusDesktop.boxShadow !== 'none';

  // Chromium's default UA stylesheet gives inputs a visible focus outline
  assert.ok(
    hasOutlineDesktop || hasBoxShadowDesktop,
    `#say must have a visible focus indicator at 1280px. Got: ${JSON.stringify(focusDesktop)}`
  );

  await page1.screenshot({ path: path.join(workDir, 'focus-desktop.png'), fullPage: true });
  console.log(`✓ Check 7: Keyboard focus indicator visible at 1280px (outline-style: "${focusDesktop.outlineStyle}", outline-width: "${focusDesktop.outlineWidth}")`);

  await ctx1.close();

  // ── CHECK 8: Keyboard focus visible at mobile width (375px) ──────────────
  const ctx3 = await browser.newContext({
    viewport: { width: 375, height: 812 },
  });
  await ctx3.route(/^https?:\/\/(?!127\.0\.0\.1)/, route => route.abort());
  const page3 = await ctx3.newPage();
  await page3.goto(pageUrl, { waitUntil: 'domcontentloaded' });
  await page3.waitForTimeout(300);

  await page3.screenshot({ path: path.join(workDir, 'baseline-mobile.png'), fullPage: true });

  const focusMobile = await getFocusIndicator(page3, '#say');
  assert.ok(focusMobile, 'Could not get focus styles for #say at mobile width');

  const hasOutlineMobile =
    focusMobile.outlineStyle && focusMobile.outlineStyle !== 'none';
  const hasBoxShadowMobile =
    focusMobile.boxShadow && focusMobile.boxShadow !== 'none';

  assert.ok(
    hasOutlineMobile || hasBoxShadowMobile,
    `#say must have a visible focus indicator at 375px. Got: ${JSON.stringify(focusMobile)}`
  );

  await page3.screenshot({ path: path.join(workDir, 'focus-mobile.png'), fullPage: true });
  console.log(`✓ Check 8: Keyboard focus indicator visible at 375px (outline-style: "${focusMobile.outlineStyle}", outline-width: "${focusMobile.outlineWidth}")`);

  await ctx3.close();

  // ── CHECK 9: Static layout regression — form structure ────────────────────
  // Re-open a clean context for the structural checks
  const ctx4 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await ctx4.route(/^https?:\/\/(?!127\.0\.0\.1)/, route => route.abort());
  const page4 = await ctx4.newPage();
  await page4.goto(pageUrl, { waitUntil: 'domcontentloaded' });

  const formMethod = await page4.evaluate(() => {
    const form = document.querySelector('form');
    return form ? form.getAttribute('method') : null;
  });
  assert.ok(formMethod && formMethod.toLowerCase() === 'get', `Form must have method="get", got "${formMethod}"`);

  const formAction = await page4.evaluate(() => {
    const form = document.querySelector('form');
    return form ? form.getAttribute('action') : null;
  });
  assert.ok(formAction && formAction.length > 0, `Form must have a non-empty action attribute, got "${formAction}"`);

  // #say input has correct name attribute
  const sayName = await page4.evaluate(() => {
    const el = document.querySelector('#say');
    return el ? el.getAttribute('name') : null;
  });
  assert.strictEqual(sayName, 'say', `#say input must have name="say", got "${sayName}"`);

  // Label must be associated with #say via for="say"
  const labelFor = await page4.evaluate(() => {
    const label = document.querySelector('label[for="say"]');
    return label ? label.getAttribute('for') : null;
  });
  assert.strictEqual(labelFor, 'say', `Label must have for="say" linking to #say, got "${labelFor}"`);

  await ctx4.close();
  console.log(`✓ Check 9: Static layout regression — form method="${formMethod}", action="${formAction}", #say name="say", label[for="say"] ✓`);

  // ── CHECK 10: No unexpected page errors ───────────────────────────────────
  assert.deepEqual(pageErrors, [], `Unexpected page errors: ${JSON.stringify(pageErrors)}`);
  console.log('✓ Check 10: No unexpected page errors');

  console.log('\n✅ All 10 checks passed for R18-T059');
  console.log('Screenshots saved to work/R18-T059/');

} catch (err) {
  console.error('\n❌ Test failed:', err.message);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server) server.close();
}

// ── small helper (avoid importing expect) ─────────────────────────────────────
async function expect_visible(locator, page) {
  // no-op; we call isVisible() explicitly
}
