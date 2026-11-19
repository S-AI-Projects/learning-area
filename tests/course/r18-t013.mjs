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
const workDir = path.resolve(repoRoot, 'work/R18-T013');
fs.mkdirSync(workDir, { recursive: true });

const PORT = process.env.TEST_PORT ? parseInt(process.env.TEST_PORT, 10) : 8000;
const PAGE_REL_PATH = 'html/tables/advanced/items-sold.html';
const EMPTY_FIXTURE_REL_PATH = 'html/tables/advanced/fixtures/items-sold-empty.html';
const TARGET_URL = `http://127.0.0.1:${PORT}/${PAGE_REL_PATH}`;
const EMPTY_FIXTURE_URL = `http://127.0.0.1:${PORT}/${EMPTY_FIXTURE_REL_PATH}`;

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
    test_id: 'R18-T013',
    target_page: PAGE_REL_PATH,
    empty_fixture: EMPTY_FIXTURE_REL_PATH,
    url: TARGET_URL,
    fixture_url: EMPTY_FIXTURE_URL,
    port: PORT,
    scenarios: [
      'baseline_rendered_table',
      'failed_asset_with_readable_fallback',
      'restored_asset_recovery',
      'input_empty_state_and_recovery',
      'static_empty_fixture_and_restoration'
    ],
    stubs: ['hardware_permission_isolation']
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
  const checks = [];

  function recordCheck(id, name, expected, actual, pass, details = {}) {
    checks.push({ check_id: id, name, expected, actual, status: pass ? 'PASS' : 'FAIL', details });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${id}: ${name}`);
  }

  try {
    serverProcess = await startServer();
    browser = await chromium.launch({ headless: true });

    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });

    const pageErrors = [];
    const page = await context.newPage();
    page.on('pageerror', (err) => pageErrors.push(err.message));

    // ==========================================
    // 1. BASELINE TABLE STRUCTURE
    // ==========================================
    console.log('\n--- 1. Baseline Table Verification ---');
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });

    const title = await page.title();
    assert.equal(title, 'Items sold summary', 'Page title must match');
    recordCheck('CHK-01', 'Page Title Verification', 'Items sold summary', title, true);

    const tableCount = await page.locator('table').count();
    assert.equal(tableCount, 1, 'Exactly one table must exist');

    const captionText = await page.locator('table caption').textContent();
    assert.equal(captionText.trim(), 'Items Sold August 2016', 'Caption text must match');
    recordCheck('CHK-02', 'Table Caption Verification', 'Items Sold August 2016', captionText.trim(), true);

    const theadRows = await page.locator('table thead tr').count();
    assert.equal(theadRows, 2, 'Thead must contain 2 header rows');

    const dataRowCount = await page.locator('table tbody tr:not(#empty-state-row)').count();
    assert.equal(dataRowCount, 5, 'Tbody must contain 5 sales data rows');
    recordCheck('CHK-03', 'Baseline Data Row Count', 5, dataRowCount, true);

    await page.screenshot({ path: path.join(workDir, 'baseline-table.png') });

    // ==========================================
    // 2. FAILED ASSET / REQUEST WITH READABLE FALLBACK
    // ==========================================
    console.log('\n--- 2. Failed Asset Request & Readable Fallback ---');
    // Abort requests to sales-report-icon.png to simulate failed asset
    await page.route('**/sales-report-icon.png', (route) => route.abort());
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });

    // Wait for image error handling
    await page.waitForTimeout(500);

    const isIconHidden = await page.locator('.report-icon').evaluate((el) => {
      const s = window.getComputedStyle(el);
      return s.display === 'none';
    });
    assert.ok(isIconHidden, 'Failed image icon must be hidden via fallback handler');

    const isFallbackVisible = await page.locator('#icon-fallback').evaluate((el) => {
      const s = window.getComputedStyle(el);
      return s.display !== 'none' && s.visibility !== 'hidden';
    });
    assert.ok(isFallbackVisible, 'Readable icon fallback must be visible when asset fails');

    const fallbackBox = await page.locator('#icon-fallback').boundingBox();
    assert.ok(fallbackBox && fallbackBox.width > 0 && fallbackBox.height > 0, 'Fallback element must have valid computed layout');
    recordCheck('CHK-04', 'Failed Asset Readable Fallback Active', true, isFallbackVisible, true, { isIconHidden, fallbackBox });

    await page.screenshot({ path: path.join(workDir, 'fallback-asset.png') });

    // ==========================================
    // 3. RESTORED ASSET RECOVERY
    // ==========================================
    console.log('\n--- 3. Restored Asset Recovery ---');
    await page.unroute('**/sales-report-icon.png');
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });

    const isIconLoaded = await page.locator('.report-icon').evaluate((img) => img.complete && img.naturalWidth > 0);
    assert.ok(isIconLoaded, 'Restored icon asset must load with positive natural dimensions');
    recordCheck('CHK-05', 'Asset Restoration Recovery', true, isIconLoaded, true);

    await page.screenshot({ path: path.join(workDir, 'restored-asset.png') });

    // ==========================================
    // 4. INTERACTIVE EMPTY STATE ON INVALID INPUT & RECOVERY
    // ==========================================
    console.log('\n--- 4. Input-driven Empty State & Recovery ---');
    const filterInput = page.locator('#table-filter');
    assert.equal(await filterInput.count(), 1, '#table-filter control must exist');

    // Enter non-matching filter input
    await filterInput.fill('NonexistentLocation123');

    const visibleDataRowsCount = await page.locator('table tbody tr:not(#empty-state-row)').evaluateAll((rows) => {
      return rows.filter((r) => window.getComputedStyle(r).display !== 'none').length;
    });
    assert.equal(visibleDataRowsCount, 0, 'No data rows should be visible for invalid/unmatched filter input');

    const isEmptyRowVisible = await page.locator('#empty-state-row').evaluate((el) => {
      return window.getComputedStyle(el).display !== 'none';
    });
    assert.ok(isEmptyRowVisible, 'Empty state row must be displayed when no records match');

    const emptyText = await page.locator('#empty-state-row').textContent();
    assert.ok(emptyText.includes('No matching sales records found.'), 'Empty state text must be meaningful and clear');
    recordCheck('CHK-06', 'Meaningful Empty State on Invalid Input', 'No matching sales records found.', emptyText.trim(), true);

    await page.screenshot({ path: path.join(workDir, 'empty-state-input.png') });

    // Recover by entering valid input
    await filterInput.fill('Belgium');

    const recoveredBelgiumRows = await page.locator('table tbody tr:not(#empty-state-row)').evaluateAll((rows) => {
      return rows.filter((r) => window.getComputedStyle(r).display !== 'none').length;
    });
    assert.ok(recoveredBelgiumRows > 0, 'Table rows must recover upon entering valid input');

    const isEmptyRowHiddenAfterValid = await page.locator('#empty-state-row').evaluate((el) => {
      return window.getComputedStyle(el).display === 'none';
    });
    assert.ok(isEmptyRowHiddenAfterValid, 'Empty state row must hide upon recovery');
    recordCheck('CHK-07', 'Recovery After Valid Input', true, recoveredBelgiumRows > 0, true, { recoveredRows: recoveredBelgiumRows });

    await page.screenshot({ path: path.join(workDir, 'recovered-input.png') });

    // ==========================================
    // 5. STATIC EMPTY RESULT FIXTURE VERIFICATION
    // ==========================================
    console.log('\n--- 5. Static Empty Result Fixture Verification ---');
    await page.goto(EMPTY_FIXTURE_URL, { waitUntil: 'domcontentloaded' });

    const fixtureTitle = await page.title();
    assert.ok(fixtureTitle.includes('Empty Result'), 'Fixture title reflects empty state');

    const fixtureEmptyRow = await page.locator('.empty-state-row').count();
    assert.equal(fixtureEmptyRow, 1, 'Static empty result fixture must contain empty state row');

    const fixtureMessage = await page.locator('.empty-message').textContent();
    assert.ok(fixtureMessage.includes('No items sold recorded'), 'Fixture displays descriptive empty message');

    const fixtureColspan = await page.locator('.empty-message').getAttribute('colspan');
    assert.equal(fixtureColspan, '7', 'Empty state cell must span all 7 columns of the table');
    recordCheck('CHK-08', 'Static Empty Result Fixture Structure', 'colspan=7 with descriptive text', `colspan=${fixtureColspan}: "${fixtureMessage.trim()}"`, true);

    await page.screenshot({ path: path.join(workDir, 'empty-fixture.png') });

    // Recover from fixture back to standard page
    await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
    const finalDataRowCount = await page.locator('table tbody tr:not(#empty-state-row)').count();
    assert.equal(finalDataRowCount, 5, 'Returning to main table restores all standard rows');
    recordCheck('CHK-09', 'Restored Fixture Data Recovery', 5, finalDataRowCount, true);

    // ==========================================
    // 6. ZERO PAGE ERRORS REJECTION
    // ==========================================
    assert.equal(pageErrors.length, 0, `Unexpected page errors detected: ${pageErrors.join('; ')}`);
    recordCheck('CHK-10', 'Zero Page Errors Rejection', 0, pageErrors.length, true);

    // Record tool versions & test outputs
    const toolVersions = {
      test_id: 'R18-T013',
      node: process.version,
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      playwright: playwrightModule?.version || 'installed',
      chromium: browser.version(),
      python: '3.14.0'
    };
    fs.writeFileSync(path.join(workDir, 'tool-versions.json'), JSON.stringify(toolVersions, null, 2), 'utf-8');
    fs.writeFileSync(path.join(workDir, 'expected-vs-actual.json'), JSON.stringify(checks, null, 2), 'utf-8');

    console.log(`\nAll ${checks.length} checks passed successfully.`);
  } catch (error) {
    console.error('Test execution failed:', error);
    fs.writeFileSync(path.join(workDir, 'error.log'), `${error.stack || error.message}\n`, 'utf-8');
    throw error;
  } finally {
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
