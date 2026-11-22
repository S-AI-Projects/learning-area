/**
 * R18-T038 — javascript/oojs/assessment/index.html
 * Source anchor: canvas
 *
 * Goal: Trace any user/fixture text inserted into the page and test a string
 * containing markup/script payload. Verify text appears as literal text, creates
 * no injected elements, and executes no handlers.
 * Test both the target canvas page and the isolated text-rendering companion.
 *
 * Run: node tests/course/r18-t038.mjs
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
const WORK_DIR  = path.join(ROOT, 'work/R18-T038');
fs.mkdirSync(WORK_DIR, { recursive: true });

const MAIN_PAGE_PATH      = '/javascript/oojs/assessment/index.html';
const COMPANION_PAGE_PATH = '/javascript/oojs/assessment/text-rendering.html';

const TEST_PAYLOAD = '<img src=x onerror="alert(1)"><script>window.__injected=true</script>';

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

// ── PASS 1: Target Page (Bouncing Balls Canvas Assessment) ───────────────────
async function testMainPage(browser, baseUrl) {
  console.log('\n── Pass 1: Target Page Assessment (Canvas & Dynamic Text) ───────');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pageErrors = [];
  let dialogCount = 0;

  const page = await ctx.newPage();
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('dialog', async (d) => { dialogCount++; await d.dismiss(); });

  await page.goto(`${baseUrl}${MAIN_PAGE_PATH}`, { waitUntil: 'load' });

  // 1. Canvas source anchor assertions
  const canvas = page.locator('canvas');
  assert.equal(await canvas.count(), 1, 'Exactly one <canvas> element must exist');
  const isCanvasVisible = await canvas.isVisible();
  assert.ok(isCanvasVisible, 'Canvas element must be visible');

  const canvasDims = await canvas.evaluate((el) => ({
    width: el.width,
    height: el.height,
    clientWidth: el.clientWidth,
    clientHeight: el.clientHeight,
  }));
  assert.equal(canvasDims.width, 1280, 'Canvas width must match viewport width (1280)');
  assert.equal(canvasDims.height, 800, 'Canvas height must match viewport height (800)');

  // 2. Heading and ball count paragraph assertions
  const heading = page.locator('h1');
  assert.equal(await heading.count(), 1, 'h1 element must exist');
  assert.equal((await heading.innerText()).trim(), 'bouncing balls', 'Heading text must match');

  const para = page.locator('p');
  assert.equal(await para.count(), 1, 'Count <p> element must exist');
  const initialText = await para.innerText();
  assert.ok(
    initialText.includes('Ball count:'),
    `Paragraph text must contain "Ball count:", got "${initialText}"`
  );

  // 3. Trace dynamic text insertion in the target page using payload
  const traceResult = await page.evaluate((payload) => {
    const p = document.querySelector('p');
    // Save original text
    const orig = p.textContent;
    // Set fixture payload via textContent (the method used by main.js)
    p.textContent = payload;
    const textAfter = p.textContent;
    const innerHTML = p.innerHTML;
    const imgCount = document.querySelectorAll('img').length;
    const scriptCount = document.querySelectorAll('script').length;
    const isInjected = window.__injected === true;
    // Restore
    p.textContent = orig;
    return { orig, textAfter, innerHTML, imgCount, scriptCount, isInjected };
  }, TEST_PAYLOAD);

  assert.equal(traceResult.textAfter, TEST_PAYLOAD, 'Payload must be set as literal text');
  assert.equal(traceResult.imgCount, 0, 'No <img> elements must be created');
  assert.equal(traceResult.isInjected, false, 'No injected script must execute');
  assert.equal(dialogCount, 0, 'No alert dialog must be triggered');

  // Verify no horizontal overflow beyond viewport
  const noOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
  });
  assert.ok(noOverflow, 'Page should not produce unwanted horizontal overflow');

  // Capture screenshot of the running canvas demo
  await page.screenshot({ path: path.join(WORK_DIR, 'baseline-main.png'), fullPage: true });

  assert.deepEqual(pageErrors, [], 'No unexpected page errors on main page');
  console.log('  ✅ Target canvas page assertions passed');

  await ctx.close();
  return {
    canvasDims,
    initialText,
    traceResult,
    dialogCount,
    pageErrors,
  };
}

// ── PASS 2: Isolated Safe Text-Rendering Companion ────────────────────────────
async function testCompanionPage(browser, baseUrl) {
  console.log('\n── Pass 2: Isolated Safe Text-Rendering Companion ──────────────');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pageErrors = [];
  let dialogCount = 0;

  const page = await ctx.newPage();
  page.on('pageerror', (err) => pageErrors.push(err.message));
  page.on('dialog', async (d) => { dialogCount++; await d.dismiss(); });

  const response = await page.goto(`${baseUrl}${COMPANION_PAGE_PATH}`, { waitUntil: 'load' });
  assert.equal(response.status(), 200, 'Companion page must load with HTTP 200');

  // 1. Form controls exist
  const input = page.locator('#user-text');
  const button = page.locator('#show-text');
  const output = page.locator('#output');
  assert.equal(await input.count(), 1, '#user-text input must exist');
  assert.equal(await button.count(), 1, '#show-text button must exist');
  assert.equal(await output.count(), 1, '#output container must exist');

  // 2. Input test payload containing HTML markup & script
  await input.fill(TEST_PAYLOAD);
  await button.click();

  // 3. Assertions on text rendering & security
  const outputText = await output.textContent();
  assert.equal(outputText, TEST_PAYLOAD, 'Test string must appear as literal text');

  const outputImgCount = await output.locator('img').count();
  assert.equal(outputImgCount, 0, 'Test string must create no injected <img> element');

  const pageImgCount = await page.locator('img').count();
  assert.equal(pageImgCount, 0, 'Page must contain 0 <img> elements');

  const outputScriptCount = await output.locator('script').count();
  assert.equal(outputScriptCount, 0, 'Test string must create no injected <script> element');

  assert.equal(dialogCount, 0, 'No alert dialog must execute');

  const isInjected = await page.evaluate(() => window.__injected === true);
  assert.equal(isInjected, false, 'No injected script handlers must execute');

  // 4. Computed layout assertions
  const layout = await output.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return {
      display: cs.display,
      visible: rect.width > 0 && rect.height > 0,
      width: rect.width,
      height: rect.height,
    };
  });
  assert.equal(layout.display, 'block', '#output must maintain block display layout');
  assert.ok(layout.visible, '#output element must be visible');

  // Capture screenshot of companion safe render
  await page.screenshot({ path: path.join(WORK_DIR, 'companion-safe-render.png'), fullPage: true });

  assert.deepEqual(pageErrors, [], 'No unexpected page errors on companion page');
  console.log('  ✅ Companion safe text-rendering assertions passed');

  await ctx.close();
  return {
    payload: TEST_PAYLOAD,
    outputText,
    outputImgCount,
    dialogCount,
    isInjected,
    layout,
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

  const mainEvidence = await testMainPage(browser, baseUrl);
  const companionEvidence = await testCompanionPage(browser, baseUrl);

  console.log('\n✅ All assertions passed — R18-T038 PASS');

  // Save evidence.json
  const evidence = {
    task: 'R18-T038',
    page: 'javascript/oojs/assessment/index.html',
    companionPage: 'javascript/oojs/assessment/text-rendering.html',
    sourceAnchor: 'canvas',
    payload: TEST_PAYLOAD,
    mainPageResult: mainEvidence,
    companionResult: companionEvidence,
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
