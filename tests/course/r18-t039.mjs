/**
 * R18-T039 — html/forms/toggle-switch-example/index.html
 * Source anchor: #power
 *
 * Goal: Test prefers-reduced-motion and visible keyboard focus indicator
 * on the toggle switch demo across two tested viewport widths (mobile & desktop).
 * Verify transitions are disabled under reduced motion while keeping controls fully usable.
 *
 * Run: node tests/course/r18-t039.mjs
 * Exit 0 = all assertions pass; non-zero = assertion failure.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import assert from 'assert/strict';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '../../');
const WORK_DIR  = path.join(ROOT, 'work/R18-T039');
fs.mkdirSync(WORK_DIR, { recursive: true });

const PAGE_PATH = '/html/forms/toggle-switch-example/index.html';

const VIEWPORTS = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'desktop', width: 1280, height: 800 },
];

// ── Local static-file server ─────────────────────────────────────────────────
function createServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(ROOT, req.url.split('?')[0]);
      if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('Not found'); return; }
      const ext  = path.extname(filePath).toLowerCase();
      const mime = {
        '.html': 'text/html; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.png': 'image/png',
      }[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(filePath).pipe(res);
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

// ── PASS A: Standard Motion (Baseline Check) ──────────────────────────────────
async function testStandardMotion(browser, baseUrl) {
  console.log('\n── Pass A: Standard Motion (no-preference) ────────────────────');
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: 'no-preference',
  });
  const pageErrors = [];
  const page = await ctx.newPage();
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.goto(`${baseUrl}${PAGE_PATH}`, { waitUntil: 'domcontentloaded' });

  const power = page.locator('#power');
  assert.equal(await power.count(), 1, '#power input must exist');

  // Verify transitions are active (0.4s) when motion preference is not reduced
  const transitionDuration = await power.evaluate((el) => {
    return window.getComputedStyle(el).transitionDuration;
  });
  assert.equal(transitionDuration, '0.4s', 'Standard motion should have 0.4s transition duration');

  assert.deepEqual(pageErrors, [], 'No uncaught page errors on standard motion pass');
  console.log('  ✅ Standard motion transition duration verified: 0.4s');

  await ctx.close();
  return { transitionDuration };
}

// ── PASS B: Reduced Motion & Visible Focus across Viewports ──────────────────
async function testReducedMotionViewport(browser, baseUrl, vp) {
  console.log(`\n── Pass B: Reduced Motion & Focus on ${vp.name} (${vp.width}x${vp.height}) ──`);
  const ctx = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
    reducedMotion: 'reduce',
  });
  const pageErrors = [];
  const page = await ctx.newPage();
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.goto(`${baseUrl}${PAGE_PATH}`, { waitUntil: 'domcontentloaded' });

  // 1. Verify prefers-reduced-motion media query matches in browser
  const matchesReduced = await page.evaluate(() => {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  assert.equal(matchesReduced, true, 'Browser must match (prefers-reduced-motion: reduce)');

  const power = page.locator('#power');
  assert.equal(await power.count(), 1, '#power input must exist');

  // 2. Verify transitions are disabled (0s) under reduced motion
  const transitionDuration = await power.evaluate((el) => {
    return window.getComputedStyle(el).transitionDuration;
  });
  assert.equal(transitionDuration, '0s', 'Under prefers-reduced-motion, transitionDuration must be 0s');

  // 3. Test keyboard focus via Tab
  await page.keyboard.press('Tab');

  const focusData = await power.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    const isFocused = document.activeElement === el;
    return {
      isFocused,
      outlineStyle: cs.outlineStyle,
      outlineWidth: cs.outlineWidth,
      outlineColor: cs.outlineColor,
      outlineOffset: cs.outlineOffset,
      rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height },
      insideViewport: rect.left >= 0 && rect.right <= window.innerWidth && rect.top >= 0 && rect.bottom <= window.innerHeight,
    };
  });

  assert.ok(focusData.isFocused, '#power must receive keyboard focus on Tab');
  assert.notEqual(focusData.outlineStyle, 'none', 'Keyboard focus indicator outlineStyle must not be none');
  assert.notEqual(focusData.outlineWidth, '0px', 'Keyboard focus indicator outlineWidth must be greater than 0');
  assert.ok(focusData.insideViewport, 'Focused element must be completely inside viewport');

  await page.screenshot({
    path: path.join(WORK_DIR, `${vp.name}-focused-reduced-motion.png`),
    fullPage: false,
  });

  // 4. Test keyboard toggle via Space key
  const initiallyChecked = await power.isChecked();
  assert.equal(initiallyChecked, false, '#power should be initially unchecked');

  await page.keyboard.press('Space');
  const checkedAfterSpace = await power.isChecked();
  assert.equal(checkedAfterSpace, true, 'Pressing Space must toggle #power to checked');

  // 5. Verify functional state updates
  const labelState = await page.evaluate(() => {
    const onSpan = document.querySelector('label .on');
    const offSpan = document.querySelector('label .off');
    const input = document.querySelector('#power');
    const inputCs = window.getComputedStyle(input);
    const onCs = window.getComputedStyle(onSpan);
    const offCs = window.getComputedStyle(offSpan);
    return {
      onOpacity: onCs.opacity,
      offOpacity: offCs.opacity,
      backgroundColor: inputCs.backgroundColor,
    };
  });

  assert.equal(labelState.onOpacity, '1', '"On" label span must have opacity 1 when checked');
  assert.equal(labelState.offOpacity, '0', '"Off" label span must have opacity 0 when checked');
  assert.equal(labelState.backgroundColor, 'rgb(255, 170, 0)', 'Background color must update to #ffaa00 (rgb(255, 170, 0))');

  await page.screenshot({
    path: path.join(WORK_DIR, `${vp.name}-toggled.png`),
    fullPage: false,
  });

  assert.deepEqual(pageErrors, [], `No uncaught page errors on ${vp.name} pass`);
  console.log(`  ✅ ${vp.name} reduced motion (0s) and visible focus verified`);

  await ctx.close();
  return {
    viewport: vp,
    matchesReduced,
    transitionDuration,
    focusData,
    checkedAfterSpace,
    labelState,
    pageErrors,
  };
}

// ── Main Execution ────────────────────────────────────────────────────────────
let server = null;
let browser = null;

try {
  server = await createServer();
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Local server: ${baseUrl}`);

  browser = await chromium.launch({ headless: true });

  const baselineMotion = await testStandardMotion(browser, baseUrl);

  const mobileResult = await testReducedMotionViewport(browser, baseUrl, VIEWPORTS[0]);
  const desktopResult = await testReducedMotionViewport(browser, baseUrl, VIEWPORTS[1]);

  console.log('\n✅ All assertions passed — R18-T039 PASS');

  // Save evidence.json
  const evidence = {
    task: 'R18-T039',
    page: PAGE_PATH,
    sourceAnchor: '#power',
    baselineMotion,
    testedWidths: {
      mobile: mobileResult,
      desktop: desktopResult,
    },
    result: 'PASS',
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(WORK_DIR, 'evidence.json'),
    JSON.stringify(evidence, null, 2)
  );
} catch (err) {
  console.error('\n❌ ASSERTION FAILURE:', err.message);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server) {
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
  }
}
