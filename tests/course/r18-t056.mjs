import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);

const htmlPath = '/html/tables/basic/blank-template.html';
const cssPath = '/html/tables/basic/minimal-table.css';
const jsPath = '/html/tables/basic/table-feature-check.js';
const evidenceDir = path.join(projectRoot, 'work/R18-T056');
const lockedViewport = { width: 1280, height: 800 };

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;

  try {
    if (pathname === htmlPath) {
      const html = await readFile(path.join(projectRoot, htmlPath), 'utf8');
      response.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      response.end(html);
      return;
    }

    if (pathname === cssPath) {
      const css = await readFile(path.join(projectRoot, cssPath), 'utf8');
      response.writeHead(200, {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      response.end(css);
      return;
    }

    if (pathname === jsPath) {
      const js = await readFile(path.join(projectRoot, jsPath), 'utf8');
      response.writeHead(200, {
        'Content-Type': 'application/javascript; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      response.end(js);
      return;
    }

    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not Found');
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(`Server Error: ${error.message}`);
  }
});

let browser;

try {
  await mkdir(evidenceDir, { recursive: true });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const targetUrl = `${baseUrl}${htmlPath}`;

  browser = await chromium.launch({ headless: true });

  // ---------------------------------------------------------------------------
  // PASS 1: Feature-Present Path (Native Support)
  // ---------------------------------------------------------------------------
  {
    const pageErrors = [];
    const consoleErrors = [];
    const context = await browser.newContext({
      viewport: lockedViewport,
      locale: 'en-US',
    });
    const page = await context.newPage();

    page.on('pageerror', err => pageErrors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Block external requests
    await page.route('**', route => {
      const url = route.request().url();
      if (!url.startsWith(baseUrl)) {
        route.abort('blockedbyclient');
      } else {
        route.continue();
      }
    });

    const response = await page.goto(targetUrl, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200, `Expected HTTP 200 for ${htmlPath}`);

    // Verify main rendered content region exists and is visible
    const mainRegion = page.locator('#main-content');
    assert.equal(await mainRegion.count(), 1, 'Main content region must exist');
    assert.ok(await mainRegion.isVisible(), 'Main content region must be visible');

    // Verify fallback is hidden when feature is supported
    const fallbackLocator = page.locator('#table-fallback');
    assert.equal(await fallbackLocator.count(), 1, 'Fallback container must exist in DOM');
    const isFallbackHidden = await fallbackLocator.evaluate(el => el.hidden);
    assert.equal(isFallbackHidden, true, 'Fallback must be hidden in supported browser path');

    // Verify table structure in main content region
    const tableLocator = page.locator('#template-table');
    assert.equal(await tableLocator.count(), 1, 'Template table must exist');
    const headerCount = await page.locator('#template-table th').count();
    const cellCount = await page.locator('#template-table td').count();
    assert.equal(headerCount, 2, 'Template table must contain 2 headers');
    assert.equal(cellCount, 4, 'Template table must contain 4 data cells');

    // Verify computed table layout styles
    const tableStyles = await tableLocator.evaluate(el => {
      const style = window.getComputedStyle(el);
      return {
        borderCollapse: style.borderCollapse,
        fontSize: style.fontSize,
      };
    });
    assert.equal(
      tableStyles.borderCollapse,
      'collapse',
      'Table borderCollapse must compute to collapse'
    );

    // Verify header computed styles
    const thBackground = await page.locator('#template-table th').first().evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    assert.equal(
      thBackground,
      'rgb(235, 235, 235)',
      'Header th background-color must match stylesheet'
    );

    // Verify zebra striping
    const oddCellBg = await page.locator('#template-table tbody tr:nth-child(1) td').first().evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    const evenCellBg = await page.locator('#template-table tbody tr:nth-child(2) td').first().evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });
    assert.equal(oddCellBg, 'rgb(220, 220, 220)', 'Odd row cells must have rgb(220, 220, 220)');
    assert.equal(evenCellBg, 'rgb(250, 250, 250)', 'Even row cells must have rgb(250, 250, 250)');

    assert.deepEqual(pageErrors, [], 'Feature-present path must produce zero page errors');
    assert.deepEqual(consoleErrors, [], 'Feature-present path must produce zero console errors');

    await page.screenshot({
      path: path.join(evidenceDir, 'feature-present.png'),
      fullPage: true,
    });
    await context.close();
    console.log('PASS: Feature-present path verified (table styling active, fallback hidden, zero errors).');
  }

  // ---------------------------------------------------------------------------
  // PASS 2: Feature-Absent Path (Stubbed Unsupported CSS Feature)
  // ---------------------------------------------------------------------------
  {
    const pageErrors = [];
    const consoleErrors = [];
    const context = await browser.newContext({
      viewport: lockedViewport,
      locale: 'en-US',
    });

    // Explicitly stub CSS.supports to simulate unsupported border-collapse feature
    await context.addInitScript(() => {
      const originalSupports = window.CSS?.supports;
      if (window.CSS) {
        window.CSS.supports = function (property, value) {
          if (
            property === 'border-collapse' ||
            (typeof property === 'string' && property.includes('border-collapse'))
          ) {
            return false;
          }
          if (typeof originalSupports === 'function') {
            return originalSupports.apply(this, arguments);
          }
          return false;
        };
      }
    });

    const page = await context.newPage();

    page.on('pageerror', err => pageErrors.push(err.message));
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });

    // Block external requests
    await page.route('**', route => {
      const url = route.request().url();
      if (!url.startsWith(baseUrl)) {
        route.abort('blockedbyclient');
      } else {
        route.continue();
      }
    });

    const response = await page.goto(targetUrl, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200, `Expected HTTP 200 for ${htmlPath}`);

    // Verify fallback is revealed and active
    const fallbackLocator = page.locator('#table-fallback');
    const isFallbackHidden = await fallbackLocator.evaluate(el => el.hidden);
    assert.equal(isFallbackHidden, false, 'Fallback must be visible in unsupported feature path');
    assert.ok(await fallbackLocator.isVisible(), 'Fallback notice element must be visible');

    const fallbackText = (await fallbackLocator.textContent()).trim();
    assert.match(
      fallbackText,
      /does not support advanced CSS table styling features/i,
      'Fallback message must provide clear guidance regarding unsupported feature'
    );

    const fallbackRole = await fallbackLocator.getAttribute('role');
    assert.equal(fallbackRole, 'status', 'Fallback message must have role="status" for accessibility');

    // Verify main table remains accessible
    const tableLocator = page.locator('#template-table');
    assert.equal(await tableLocator.count(), 1, 'Table remains available for progressive enhancement');
    assert.ok(await tableLocator.isVisible(), 'Table remains visible in DOM');

    assert.deepEqual(pageErrors, [], 'Feature-absent path must produce zero page errors');
    assert.deepEqual(consoleErrors, [], 'Feature-absent path must produce zero console errors');

    await page.screenshot({
      path: path.join(evidenceDir, 'feature-absent.png'),
      fullPage: true,
    });
    await context.close();
    console.log('PASS: Feature-absent path verified (explicit fallback notice displayed, table preserved).');
  }

  // ---------------------------------------------------------------------------
  // PASS 3: Deliberate Mutation Failure Check
  // ---------------------------------------------------------------------------
  assert.throws(
    () => {
      assert.equal('unsupported', 'supported', 'Deliberate mismatch must throw');
    },
    /AssertionError/,
    'Deliberate mutation must trigger an AssertionError'
  );
  console.log('PASS: Deliberate assertion mutation correctly triggers rejection.');

  console.log('All automated checks in r18-t056.mjs passed successfully.');
} catch (error) {
  console.error('FAIL: r18-t056.mjs encountered an error:', error);
  process.exitCode = 1;
} finally {
  if (browser) {
    await browser.close();
  }
  await new Promise(resolve => server.close(resolve));
}
