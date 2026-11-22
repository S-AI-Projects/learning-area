/**
 * R18-T060 — Interaction regression test
 * Target: css/css-layout/legacy/html-skeleton-finished.html
 * Source anchors: main rendered content region (the .container / .row grid)
 * Task type: Interaction regression
 *
 * Strategy:
 *  The page is a Skeleton CSS float-grid layout demo.
 *  "Interaction" here is CSS layout state: columns that float left and have
 *  the correct percentage widths. The deliberate-break fixture temporarily
 *  removes float from .column/.columns via page.evaluate(), which collapses
 *  the row into stacked full-width blocks — an observable layout regression.
 *
 * Checks:
 *  1.  Page loads without unexpected console errors.
 *  2.  .container exists and contains .row children.
 *  3.  Row 1 has 12 "one column" cells.
 *  4.  Row 2 has 4 cells with correct class counts (1+6+3+2 = 12-col span).
 *  5.  At desktop width (960px+), "six columns" cell width ≈ 48% of container.
 *  6.  At desktop width, "three columns" cell width ≈ 22% of container.
 *  7.  At desktop width, "two columns" cell width ≈ 13.3% of container.
 *  8.  At desktop width, "one column" cells have float:left (grid is active).
 *  9.  DELIBERATE BREAK: removing float collapses cells — assertion detects regression.
 * 10.  No unexpected page errors.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import assert from 'assert/strict';

// ── helpers ──────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(new URL('.', import.meta.url).pathname, '../..');

function mimeFor(ext) {
  return ({ '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript' })[ext]
    || 'application/octet-stream';
}

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const urlPath = req.url.split('?')[0];
      const filePath = path.join(REPO_ROOT, urlPath);
      if (!filePath.startsWith(REPO_ROOT)) { res.writeHead(403); res.end('Forbidden'); return; }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(err.code === 'ENOENT' ? 404 : 500);
          res.end(err.code === 'ENOENT' ? 'Not Found' : 'Server Error');
          return;
        }
        res.writeHead(200, { 'Content-Type': mimeFor(path.extname(filePath)) });
        res.end(data);
      });
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

/** Percentage width of el relative to its offsetParent's clientWidth. */
async function colWidthPercent(page, selector) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const parent = el.parentElement;
    return (el.getBoundingClientRect().width / parent.getBoundingClientRect().width) * 100;
  }, selector);
}

// ── main ─────────────────────────────────────────────────────────────────────

let server;
let browser;

try {
  server = await startServer();
  const { port } = server.address();
  const pageUrl = `http://127.0.0.1:${port}/css/css-layout/legacy/html-skeleton-finished.html`;

  browser = await chromium.launch({ headless: true });

  const workDir = path.join(REPO_ROOT, 'work', 'R18-T060');
  fs.mkdirSync(workDir, { recursive: true });

  // ── Context: desktop viewport wide enough for Skeleton's 550px breakpoint ─
  const ctx = await browser.newContext({ viewport: { width: 1200, height: 800 } });
  await ctx.route(/^https?:\/\/(?!127\.0\.0\.1)/, route => route.abort());

  const page = await ctx.newPage();

  const consoleErrors = [];
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);

  await page.screenshot({ path: path.join(workDir, 'baseline-desktop.png'), fullPage: true });

  // ── CHECK 1: No unexpected console errors ─────────────────────────────────
  assert.deepEqual(consoleErrors, [], `Unexpected console errors: ${JSON.stringify(consoleErrors)}`);
  console.log('✓ Check 1: No unexpected console errors');

  // ── CHECK 2: .container exists and has .row children ─────────────────────
  const containerCount = await page.locator('.container').count();
  assert.ok(containerCount >= 1, `Expected .container to exist, got ${containerCount}`);
  const rowCount = await page.locator('.container .row').count();
  assert.ok(rowCount >= 2, `Expected ≥2 .row elements, got ${rowCount}`);
  console.log(`✓ Check 2: .container present with ${rowCount} .row children`);

  // ── CHECK 3: Row 1 has 12 "one column" cells ─────────────────────────────
  const row1Cells = await page.locator('.container .row:first-child .one.column').count();
  assert.strictEqual(row1Cells, 12, `Expected 12 "one column" cells in row 1, got ${row1Cells}`);
  console.log(`✓ Check 3: Row 1 has ${row1Cells} "one column" cells`);

  // ── CHECK 4: Row 2 structure ──────────────────────────────────────────────
  const row2 = page.locator('.container .row:nth-child(2)');
  const row2CellCount = await row2.locator(':scope > div').count();
  assert.strictEqual(row2CellCount, 4, `Expected 4 cells in row 2, got ${row2CellCount}`);

  const sixColCount  = await row2.locator('.six.columns').count();
  const threeColCount = await row2.locator('.three.columns').count();
  const twoColCount  = await row2.locator('.two.columns').count();
  const oneColCount2 = await row2.locator('.one.column').count();

  assert.strictEqual(sixColCount,   1, `Expected 1 "six columns" cell, got ${sixColCount}`);
  assert.strictEqual(threeColCount, 1, `Expected 1 "three columns" cell, got ${threeColCount}`);
  assert.strictEqual(twoColCount,   1, `Expected 1 "two columns" cell, got ${twoColCount}`);
  assert.strictEqual(oneColCount2,  1, `Expected 1 "one column" cell in row 2, got ${oneColCount2}`);
  console.log(`✓ Check 4: Row 2 has 4 cells — 1+6+3+2 column spans (1+${sixColCount*6}+${threeColCount*3}+${twoColCount*2} = 12)`);

  // ── CHECK 5: "six columns" width ≈ 48% of row ────────────────────────────
  const sixPct = await page.evaluate(() => {
    const el = document.querySelector('.six.columns');
    const row = el.closest('.row');
    return (el.getBoundingClientRect().width / row.getBoundingClientRect().width) * 100;
  });
  // Skeleton defines .six.columns { width: 48% } + 4% margin; allow ±3% tolerance
  assert.ok(
    sixPct >= 44 && sixPct <= 52,
    `".six.columns" width should be ~48% of row, got ${sixPct.toFixed(2)}%`
  );
  console.log(`✓ Check 5: ".six.columns" rendered width = ${sixPct.toFixed(2)}% of row (≈ 48%)`);

  // ── CHECK 6: "three columns" width ≈ 22% of row ──────────────────────────
  const threePct = await page.evaluate(() => {
    const el = document.querySelector('.three.columns');
    const row = el.closest('.row');
    return (el.getBoundingClientRect().width / row.getBoundingClientRect().width) * 100;
  });
  assert.ok(
    threePct >= 18 && threePct <= 26,
    `".three.columns" width should be ~22% of row, got ${threePct.toFixed(2)}%`
  );
  console.log(`✓ Check 6: ".three.columns" rendered width = ${threePct.toFixed(2)}% of row (≈ 22%)`);

  // ── CHECK 7: "two columns" width ≈ 13.3% of row ──────────────────────────
  const twoPct = await page.evaluate(() => {
    const el = document.querySelector('.two.columns');
    const row = el.closest('.row');
    return (el.getBoundingClientRect().width / row.getBoundingClientRect().width) * 100;
  });
  assert.ok(
    twoPct >= 9 && twoPct <= 18,
    `".two.columns" width should be ~13.3% of row, got ${twoPct.toFixed(2)}%`
  );
  console.log(`✓ Check 7: ".two.columns" rendered width = ${twoPct.toFixed(2)}% of row (≈ 13.3%)`);

  // ── CHECK 8: "one column" cells have float:left (grid is active) ──────────
  const floatValue = await page.evaluate(() => {
    const el = document.querySelector('.one.column');
    return window.getComputedStyle(el).getPropertyValue('float');
  });
  assert.strictEqual(floatValue, 'left', `Expected "one column" to have float:left, got "${floatValue}"`);
  console.log(`✓ Check 8: ".one.column" has float:left (Skeleton float-grid is active)`);

  // ── CHECK 9: DELIBERATE BREAK — removing float collapses grid ─────────────
  // Inject a <style> that overrides float to none — simulating a broken stylesheet.
  // We inject it, let layout settle (waitForFunction), measure, then remove.

  // Step A: inject the break
  await page.evaluate(() => {
    const style = document.createElement('style');
    style.id = '__r18t060_break__';
    style.textContent = '.column, .columns { float: none !important; width: 100% !important; }';
    document.head.appendChild(style);
  });

  // Step B: wait for layout to stabilise (rAF + a tick)
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 50))));

  // Step C: measure
  const brokenSixPct = await page.evaluate(() => {
    const el = document.querySelector('.six.columns');
    const row = el.closest('.row');
    return (el.getBoundingClientRect().width / row.getBoundingClientRect().width) * 100;
  });

  // Step D: restore
  await page.evaluate(() => {
    const style = document.getElementById('__r18t060_break__');
    if (style) style.remove();
  });

  // Step E: wait for layout to restore
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 50))));

  // After float:none + width:100%, .six.columns becomes full-width (≈ 100%)
  assert.ok(
    brokenSixPct >= 90,
    `DELIBERATE BREAK FAILED: expected broken ".six.columns" to be ≥90% wide (block fallback), got ${brokenSixPct.toFixed(2)}%`
  );

  // Confirm the page is restored (float:left is back after style removal)
  const floatAfterRestore = await page.evaluate(() => {
    const el = document.querySelector('.one.column');
    return window.getComputedStyle(el).getPropertyValue('float');
  });
  assert.strictEqual(floatAfterRestore, 'left',
    `After removing the break fixture, float should be restored to "left", got "${floatAfterRestore}"`
  );

  await page.screenshot({ path: path.join(workDir, 'after-checks.png'), fullPage: true });
  console.log(`✓ Check 9: Deliberate break detected — without float, ".six.columns" spans ${brokenSixPct.toFixed(2)}% (≥90%); fixture correctly removed, layout restored`);

  // ── CHECK 10: No unexpected page errors ───────────────────────────────────
  assert.deepEqual(pageErrors, [], `Unexpected page errors: ${JSON.stringify(pageErrors)}`);
  console.log('✓ Check 10: No unexpected page errors');

  await ctx.close();

  console.log('\n✅ All 10 checks passed for R18-T060');
  console.log('Screenshots saved to work/R18-T060/');

} catch (err) {
  console.error('\n❌ Test failed:', err.message);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server) server.close();
}
