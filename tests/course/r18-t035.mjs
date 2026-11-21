/**
 * R18-T035 — css/web-fonts/google-font.html
 * Goal: Replace external Google Fonts requests with local fixtures;
 *       lock viewport and font fixtures; assert DOM state is identical
 *       across two fresh browser contexts.
 *
 * Run: node tests/course/r18-t035.mjs
 * Exit 0 = all assertions pass; non-zero = assertion failure.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import assert from 'assert/strict';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../../');
const WORK_DIR = path.join(ROOT, 'work/R18-T035');
fs.mkdirSync(WORK_DIR, { recursive: true });

// ── Local static-file server ────────────────────────────────────────────────
function createServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(ROOT, req.url.split('?')[0]);
      // prevent path traversal
      if (!filePath.startsWith(ROOT)) {
        res.writeHead(403); res.end(); return;
      }
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      if (!fs.existsSync(filePath)) {
        res.writeHead(404); res.end('Not found'); return;
      }
      const ext = path.extname(filePath).toLowerCase();
      const mime = {
        '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
        '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf',
        '.otf': 'font/otf', '.png': 'image/png', '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml', '.json': 'application/json',
      }[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

// ── Stub CSS returned for the Google Fonts request ──────────────────────────
// Uses the locally available Cicle_Fina.ttf and Zantroke.otf as stand-ins
// so the test never touches a public network endpoint.
const LOCAL_FONT_STUB_CSS = `
/* Fixture: stubs fonts.googleapis.com/css?family=Lobster|Raleway          */
/* Uses locally available fonts from the repo so the test is network-free. */
@font-face {
  font-family: 'Lobster';
  src: url('/css/web-fonts/fonts/zantroke-webfont.woff2') format('woff2'),
       url('/css/web-fonts/fonts/zantroke-webfont.woff')  format('woff');
  font-weight: normal;
  font-style: normal;
}
@font-face {
  font-family: 'Raleway';
  src: url('/css/web-fonts/fonts/cicle_fina-webfont.woff2') format('woff2'),
       url('/css/web-fonts/fonts/cicle_fina-webfont.woff')  format('woff');
  font-weight: normal;
  font-style: normal;
}
`;

// ── Helper: run one full test pass in a given browser context ───────────────
async function runPass(browser, baseUrl, label, passIndex) {
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    // disable actual font downloads from network; we stub the CSS endpoint
  });
  const pageErrors = [];
  const page = await ctx.newPage();
  page.on('pageerror', (err) => pageErrors.push(err.message));

  // Intercept the Google Fonts CSS request and serve local fixture
  await page.route('https://fonts.googleapis.com/**', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'text/css; charset=utf-8',
      body: LOCAL_FONT_STUB_CSS,
    });
  });

  await page.goto(`${baseUrl}/css/web-fonts/google-font.html`, {
    waitUntil: 'networkidle',
  });

  // ── 1. Main content region: body is the main rendered content region ──────
  const bodyEl = page.locator('body');
  await bodyEl.waitFor({ state: 'visible' });

  // ── 2. DOM structure assertions ───────────────────────────────────────────
  // h1 present and has expected text
  const h1Text = await page.locator('h1').innerText();
  assert.equal(h1Text.trim(), 'Hipster ipsum is the best',
    'h1 must carry the example heading');

  // Two h2 elements
  const h2Count = await page.locator('h2').count();
  assert.equal(h2Count, 2, 'Page must have exactly 2 h2 elements');

  // Paragraph count
  const pCount = await page.locator('p').count();
  assert.ok(pCount >= 4, `Expected ≥4 paragraphs, got ${pCount}`);

  // ── 3. Computed layout / font-family assertions ───────────────────────────
  // The CSS sets h1,h2 font-family to 'Lobster', p to 'Raleway'
  const h1FontFamily = await page.locator('h1').evaluate(
    (el) => getComputedStyle(el).fontFamily
  );
  assert.ok(
    h1FontFamily.toLowerCase().includes('lobster'),
    `h1 computed font-family must include 'Lobster'; got: ${h1FontFamily}`
  );

  const pFontFamily = await page.locator('p').first().evaluate(
    (el) => getComputedStyle(el).fontFamily
  );
  assert.ok(
    pFontFamily.toLowerCase().includes('raleway'),
    `p computed font-family must include 'Raleway'; got: ${pFontFamily}`
  );

  // ── 4. No horizontal overflow at locked viewport ──────────────────────────
  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth:  document.documentElement.clientWidth,
  }));
  assert.ok(
    scrollWidth <= clientWidth,
    `Unexpected horizontal overflow: scrollWidth=${scrollWidth} > clientWidth=${clientWidth}`
  );

  // ── 5. h1 font-size: 4rem = 40px (html font-size: 10px) ──────────────────
  const h1FontSize = await page.locator('h1').evaluate(
    (el) => parseFloat(getComputedStyle(el).fontSize)
  );
  assert.ok(
    h1FontSize >= 39 && h1FontSize <= 41,
    `h1 font-size must be ~40px (4rem×10px); got ${h1FontSize}px`
  );

  // ── 6. body width constraint: max-width 800px ─────────────────────────────
  const bodyWidth = await page.locator('body').evaluate(
    (el) => el.getBoundingClientRect().width
  );
  assert.ok(
    bodyWidth <= 800,
    `body width must be ≤800px (max-width constraint); got ${bodyWidth}px`
  );

  // ── 7. No uncaught page errors ────────────────────────────────────────────
  assert.deepEqual(pageErrors, [], 'No uncaught page errors expected');

  // Screenshot for review
  const screenshotPath = path.join(WORK_DIR, `pass-${passIndex}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`  [pass ${passIndex}] screenshot → ${screenshotPath}`);

  // Collect snapshot for comparison
  const snapshot = {
    h1Text,
    h2Count,
    pCount,
    h1FontFamily,
    pFontFamily,
    scrollWidth,
    clientWidth,
    h1FontSize: Math.round(h1FontSize),
    bodyWidth: Math.round(bodyWidth),
  };

  await ctx.close();
  return snapshot;
}

// ── Main ─────────────────────────────────────────────────────────────────────
let server;
let browser;

try {
  server = await createServer();
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Local server: ${baseUrl}`);

  browser = await chromium.launch({ headless: true });

  console.log('\nPass 1 (first fresh browser context)…');
  const snap1 = await runPass(browser, baseUrl, 'first', 1);
  console.log('  snapshot:', snap1);

  console.log('\nPass 2 (second fresh browser context)…');
  const snap2 = await runPass(browser, baseUrl, 'second', 2);
  console.log('  snapshot:', snap2);

  // ── Cross-context consistency: both passes must produce identical DOM ──────
  assert.deepEqual(snap1, snap2,
    'Two fresh browser contexts must produce identical DOM state');

  console.log('\n✅ All assertions passed — R18-T035 PASS');

  // Write evidence.json
  const evidence = {
    task: 'R18-T035',
    page: 'css/web-fonts/google-font.html',
    sourceAnchors: ['body (main rendered content region)'],
    googleFontsStubbed: true,
    viewportLocked: { width: 1280, height: 800 },
    pass1: snap1,
    pass2: snap2,
    consistent: true,
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
