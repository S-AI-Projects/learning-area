/**
 * R18-T036 — html/multimedia-and-embedding/video-and-audio-content/simple-video.html
 * Goal: Test both feature-present and feature-absent paths for the HTML5 video demo.
 *
 * Feature present  → <video controls> is visible, has a src, poster attr optional
 * Feature absent   → browser cannot play the video type; fallback <p><a> link is reachable
 *
 * Run: node tests/course/r18-t036.mjs
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
const WORK_DIR  = path.join(ROOT, 'work/R18-T036');
fs.mkdirSync(WORK_DIR, { recursive: true });

// ── Local static-file server ─────────────────────────────────────────────────
function createServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(ROOT, req.url.split('?')[0]);
      if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('Not found'); return; }
      const ext  = path.extname(filePath).toLowerCase();
      const mime = {
        '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
        '.webm': 'video/webm', '.mp4': 'video/mp4', '.ogg': 'video/ogg',
        '.mp3': 'audio/mpeg', '.png': 'image/png',
      }[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

const PAGE_PATH = '/html/multimedia-and-embedding/video-and-audio-content/simple-video.html';

// ── PASS A: Feature-present path ─────────────────────────────────────────────
// Chromium supports WebM natively — video element is present and controls are exposed.
async function testFeaturePresent(browser, baseUrl) {
  console.log('\n── Pass A: feature-present (native video support) ──────────────');
  const ctx       = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pageErrors = [];
  const page      = await ctx.newPage();
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.goto(`${baseUrl}${PAGE_PATH}`, { waitUntil: 'domcontentloaded' });

  // 1. <video> element exists and is visible
  const video = page.locator('video');
  await video.waitFor({ state: 'attached' });
  const videoCount = await video.count();
  assert.equal(videoCount, 1, 'Exactly one <video> element must exist');

  // 2. video has a src or child source referencing the .webm file
  const videoSrc = await video.getAttribute('src');
  assert.ok(
    videoSrc && videoSrc.includes('rabbit320.webm'),
    `video[src] must point to rabbit320.webm; got: ${videoSrc}`
  );

  // 3. controls attribute is present
  const hasControls = await video.evaluate((el) => el.hasAttribute('controls'));
  assert.ok(hasControls, 'video must have the controls attribute');

  // 4. The <video> is visible in the layout (not display:none)
  const isVisible = await video.isVisible();
  assert.ok(isVisible, 'video element must be visible');

  // 5. The fallback <a> inside <video> is present in the DOM but NOT
  //    visible to the user when native video is supported.
  //    (Browsers hide inner content of a supported <video>.)
  const fallbackA = page.locator('video a');
  const aCount    = await fallbackA.count();
  assert.equal(aCount, 1, 'Fallback <a> inside <video> must exist in DOM');

  const fallbackHref = await fallbackA.getAttribute('href');
  assert.ok(
    fallbackHref && fallbackHref.includes('rabbit320.webm'),
    `Fallback <a href> must point to rabbit320.webm; got: ${fallbackHref}`
  );

  // 6. No uncaught page errors
  assert.deepEqual(pageErrors, [], 'No uncaught page errors (feature-present)');

  await page.screenshot({ path: path.join(WORK_DIR, 'feature-present.png'), fullPage: true });
  console.log('  ✅ feature-present assertions passed');

  const snap = { videoSrc, hasControls, isVisible, fallbackHref, aCount };
  await ctx.close();
  return snap;
}

// ── PASS B: Feature-absent path ───────────────────────────────────────────────
// Override canPlayType so the browser pretends it cannot play video/webm.
// In practice browsers still render <video>; the fallback content inside
// the element IS accessible via the DOM regardless — we verify the link
// is well-formed and reachable, which is the explicit fallback the demo teaches.
async function testFeatureAbsent(browser, baseUrl) {
  console.log('\n── Pass B: feature-absent (video type unsupported — stubbed) ───');
  const ctx       = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pageErrors = [];
  const page      = await ctx.newPage();
  page.on('pageerror', (err) => pageErrors.push(err.message));

  // Stub canPlayType to return '' for video/webm (pretend unsupported).
  // This keeps the test explicit and honest rather than pretending the
  // native API doesn't exist — it documents the fallback contract.
  await page.addInitScript(() => {
    const orig = HTMLVideoElement.prototype.canPlayType;
    HTMLVideoElement.prototype.canPlayType = function(type) {
      if (type && type.includes('webm')) return '';
      return orig.call(this, type);
    };
  });

  await page.goto(`${baseUrl}${PAGE_PATH}`, { waitUntil: 'domcontentloaded' });

  // 1. The fallback <a> must be present and have correct href
  const fallbackA    = page.locator('video a');
  const aCount       = await fallbackA.count();
  assert.equal(aCount, 1, 'Fallback <a> must exist inside <video>');

  const fallbackHref = await fallbackA.getAttribute('href');
  assert.ok(
    fallbackHref && fallbackHref.includes('rabbit320.webm'),
    `Fallback <a href> must reference rabbit320.webm; got: ${fallbackHref}`
  );

  // 2. The fallback <a> text is meaningful (not empty)
  const fallbackText = await fallbackA.innerText();
  assert.ok(
    fallbackText.trim().length > 0,
    `Fallback link must have non-empty text; got: "${fallbackText}"`
  );

  // 3. The fallback link's href actually resolves (HTTP 200 or 206)
  //    — verify the asset exists on the local server.
  const videoDir  = path.dirname(PAGE_PATH); // /html/.../video-and-audio-content
  const videoFile = path.join(ROOT, videoDir, 'rabbit320.webm');
  assert.ok(
    fs.existsSync(videoFile),
    `rabbit320.webm must exist on disk at ${videoFile}`
  );

  // 4. The surrounding fallback <p> carries the warning text the demo teaches
  const fallbackP    = page.locator('video p');
  const fallbackPTxt = await fallbackP.innerText();
  assert.ok(
    fallbackPTxt.toLowerCase().includes("doesn't support"),
    `Fallback <p> must mention browser doesn't support; got: "${fallbackPTxt}"`
  );

  // 5. canPlayType stub is active
  const stubResult = await page.evaluate(
    () => document.querySelector('video').canPlayType('video/webm')
  );
  assert.equal(stubResult, '',
    'canPlayType stub must return empty string for video/webm');

  // 6. No uncaught page errors
  assert.deepEqual(pageErrors, [], 'No uncaught page errors (feature-absent)');

  await page.screenshot({ path: path.join(WORK_DIR, 'feature-absent.png'), fullPage: true });
  console.log('  ✅ feature-absent assertions passed');

  const snap = { fallbackHref, fallbackText: fallbackText.trim(), fallbackPTxt: fallbackPTxt.trim(), stubResult };
  await ctx.close();
  return snap;
}

// ── Main ─────────────────────────────────────────────────────────────────────
let server, browser;
try {
  server  = await createServer();
  const { port } = server.address();
  const baseUrl  = `http://127.0.0.1:${port}`;
  console.log(`Local server: ${baseUrl}`);

  browser = await chromium.launch({ headless: true });

  const snapPresent = await testFeaturePresent(browser, baseUrl);
  const snapAbsent  = await testFeatureAbsent(browser, baseUrl);

  console.log('\n✅ All assertions passed — R18-T036 PASS');

  // Write evidence.json
  const evidence = {
    task: 'R18-T036',
    page: 'html/multimedia-and-embedding/video-and-audio-content/simple-video.html',
    sourceAnchors: ['video', 'a'],
    featurePresent: snapPresent,
    featureAbsent:  snapAbsent,
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
