/**
 * R18-T040 — accessibility/multimedia/custom-controls-OOJS/index.html
 * Source anchors: audio, a, video
 *
 * Goal: Record the main visible behavior (custom media controls, DOM layout,
 * and play/pause/stop event interactions), deliberately break an event binding
 * and style rule in a temporary test fixture, and verify assertions distinguish
 * the correct and broken states.
 *
 * Run: node tests/course/r18-t040.mjs
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
const WORK_DIR  = path.join(ROOT, 'work/R18-T040');
fs.mkdirSync(WORK_DIR, { recursive: true });

const PAGE_PATH = '/accessibility/multimedia/custom-controls-OOJS/index.html';
const CSS_PATH  = path.join(ROOT, 'accessibility/multimedia/custom-controls.css');
const JS_PATH   = path.join(ROOT, 'accessibility/multimedia/custom-controls-OOJS/main.js');

const originalCss = fs.readFileSync(CSS_PATH, 'utf8');
const originalJs  = fs.readFileSync(JS_PATH, 'utf8');

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
        '.mp3': 'audio/mpeg',
        '.ogg': 'audio/ogg',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.png': 'image/png',
      }[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(filePath).pipe(res);
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

// ── PASS 1: Correct Page Behavior (Baseline Verification) ────────────────────
async function testCorrectPage(browser, baseUrl) {
  console.log('\n── Pass 1: Correct Page Behavior (Baseline Verification) ───────');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pageErrors = [];
  const page = await ctx.newPage();
  page.on('pageerror', (err) => pageErrors.push(err.message));

  await page.goto(`${baseUrl}${PAGE_PATH}`, { waitUntil: 'load' });

  // 1. Source anchors: audio, a, video
  const audio = page.locator('audio');
  const video = page.locator('video');
  const fallbackLinks = page.locator('audio a, video a');

  assert.equal(await audio.count(), 1, 'Exactly one <audio> element must exist');
  assert.equal(await video.count(), 1, 'Exactly one <video> element must exist');
  assert.equal(await fallbackLinks.count(), 2, 'Fallback links for audio and video must exist in DOM');

  // 2. Native controls removed by main.js
  const audioControls = await audio.evaluate((el) => el.hasAttribute('controls'));
  const videoControls = await video.evaluate((el) => el.hasAttribute('controls'));
  assert.equal(audioControls, false, 'Native controls must be removed from <audio>');
  assert.equal(videoControls, false, 'Native controls must be removed from <video>');

  // 3. Custom controls injected
  const controlsBars = page.locator('.controls');
  assert.equal(await controlsBars.count(), 2, 'Two .controls containers must be injected');

  const playPauseBtns = page.locator('.controls .playpause');
  const stopBtns      = page.locator('.controls .stop');
  const rwdBtns       = page.locator('.controls .rwd');
  const fwdBtns       = page.locator('.controls .fwd');
  const timeLabels    = page.locator('.controls .time');

  assert.equal(await playPauseBtns.count(), 2, 'Two play/pause buttons must exist');
  assert.equal(await stopBtns.count(), 2, 'Two stop buttons must exist');
  assert.equal(await rwdBtns.count(), 2, 'Two rewind buttons must exist');
  assert.equal(await fwdBtns.count(), 2, 'Two forward buttons must exist');
  assert.equal(await timeLabels.count(), 2, 'Two time labels must exist');

  // 4. Initial button texts
  assert.equal(await playPauseBtns.nth(0).innerText(), 'Play');
  assert.equal(await playPauseBtns.nth(1).innerText(), 'Play');
  assert.equal(await stopBtns.nth(0).innerText(), 'Stop');
  assert.equal(await timeLabels.nth(0).innerText(), '00:00');

  // 5. Computed layout assertions
  const playerLayout = await page.locator('.player').first().evaluate((el) => {
    const cs = window.getComputedStyle(el);
    return { width: cs.width, display: cs.display };
  });
  assert.equal(playerLayout.width, '480px', '.player computed width must be 480px');

  const controlsLayout = await controlsBars.first().evaluate((el) => {
    const cs = window.getComputedStyle(el);
    return { height: cs.height, width: cs.width };
  });
  assert.equal(controlsLayout.height, '36px', '.controls computed height must be 36px');

  await page.screenshot({ path: path.join(WORK_DIR, 'correct-page.png'), fullPage: true });

  // 6. Event Interaction: Play/Pause video
  const videoPlayBtn = playPauseBtns.nth(1);
  await videoPlayBtn.click();

  const textAfterPlay = await videoPlayBtn.innerText();
  assert.equal(textAfterPlay, 'Pause', 'Play button text must change to "Pause" when playing');

  const isVideoPaused = await video.evaluate((v) => v.paused);
  assert.equal(isVideoPaused, false, 'Video element must be playing (paused === false)');

  await page.screenshot({ path: path.join(WORK_DIR, 'playing-state.png'), fullPage: true });

  // 7. Event Interaction: Stop video
  const videoStopBtn = stopBtns.nth(1);
  await videoStopBtn.click();

  const textAfterStop = await videoPlayBtn.innerText();
  assert.equal(textAfterStop, 'Play', 'Play button text must reset to "Play" when stopped');

  const videoTimeAfterStop = await video.evaluate((v) => v.currentTime);
  assert.equal(videoTimeAfterStop, 0, 'Video currentTime must reset to 0 when stopped');

  assert.deepEqual(pageErrors, [], 'No unexpected page errors in correct page pass');
  console.log('  ✅ Correct page assertions and event interactions passed');

  await ctx.close();
  return {
    playerLayout,
    controlsLayout,
    initialPlayText: 'Play',
    textAfterPlay,
    textAfterStop,
    videoTimeAfterStop,
  };
}

// ── PASS 2: Deliberate Event Binding Mutation (Temporary Route Fixture) ───────
async function testDeliberateEventMutation(browser, baseUrl) {
  console.log('\n── Pass 2: Deliberate Event Binding Mutation Fixture ───────────');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  // Deliberately break the play/pause event binding in main.js
  await page.route('**/main.js', async (route) => {
    const brokenJs = originalJs.replace(
      'this.playPauseBtn.onclick = function() {',
      '// BROKEN EVENT BINDING MUTATION\nthis.playPauseBtn.onclick = null; function unused() {'
    );
    assert.notEqual(brokenJs, originalJs, 'Deliberate event mutation must differ from original JS');
    await route.fulfill({ status: 200, contentType: 'text/javascript', body: brokenJs });
  });

  await page.goto(`${baseUrl}${PAGE_PATH}`, { waitUntil: 'load' });

  const videoPlayBtn = page.locator('.controls .playpause').nth(1);
  const video        = page.locator('video');

  // Attempt click on mutated play/pause button
  await videoPlayBtn.click();

  const textAfterClick = await videoPlayBtn.innerText();
  const isVideoPaused  = await video.evaluate((v) => v.paused);

  // Behavioral assertion distinguishing broken vs correct state:
  // In correct state: textAfterClick === 'Pause', isVideoPaused === false
  // In broken state:  textAfterClick === 'Play',  isVideoPaused === true
  const isBrokenDetected = (textAfterClick === 'Play' && isVideoPaused === true);
  assert.ok(
    isBrokenDetected,
    'Deliberately broken event binding must fail to change text to Pause or start playback'
  );

  await page.screenshot({ path: path.join(WORK_DIR, 'mutated-event-broken.png'), fullPage: true });
  console.log('  ✅ Deliberate event mutation correctly detected and distinguished');

  await ctx.close();
  return {
    mutationType: 'event_binding_broken',
    textAfterClick,
    isVideoPaused,
    isBrokenDetected,
  };
}

// ── PASS 3: Deliberate Style Rule Mutation (Temporary Route Fixture) ──────────
async function testDeliberateStyleMutation(browser, baseUrl) {
  console.log('\n── Pass 3: Deliberate Style Rule Mutation Fixture ─────────────');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  // Deliberately break .controls height in custom-controls.css
  await page.route('**/custom-controls.css', async (route) => {
    const brokenCss = originalCss.replace(
      '.controls {\n  height: 36px;\n}',
      '.controls {\n  height: 0px;\n  display: none;\n}'
    );
    assert.notEqual(brokenCss, originalCss, 'Deliberate CSS mutation must differ from original CSS');
    await route.fulfill({ status: 200, contentType: 'text/css', body: brokenCss });
  });

  await page.goto(`${baseUrl}${PAGE_PATH}`, { waitUntil: 'load' });

  const controlsBar = page.locator('.controls').first();
  const isVisible   = await controlsBar.isVisible();
  const height      = await controlsBar.evaluate((el) => window.getComputedStyle(el).height);

  // Behavioral assertion distinguishing broken vs correct state:
  // Correct state: isVisible === true, height === '36px'
  // Broken state:  isVisible === false, height === '0px'
  const isStyleBrokenDetected = (!isVisible || height === '0px');
  assert.ok(
    isStyleBrokenDetected,
    'Deliberately broken style fixture must fail controls visibility'
  );

  await page.screenshot({ path: path.join(WORK_DIR, 'mutated-style-broken.png'), fullPage: true });
  console.log('  ✅ Deliberate style mutation correctly detected and distinguished');

  await ctx.close();
  return {
    mutationType: 'style_rule_broken',
    isVisible,
    height,
    isStyleBrokenDetected,
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

  browser = await chromium.launch({
    headless: true,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });

  const correctEvidence = await testCorrectPage(browser, baseUrl);
  const eventMutationEvidence = await testDeliberateEventMutation(browser, baseUrl);
  const styleMutationEvidence = await testDeliberateStyleMutation(browser, baseUrl);

  // Assert that source files on disk were NEVER permanently mutated
  const currentJs  = fs.readFileSync(JS_PATH, 'utf8');
  const currentCss = fs.readFileSync(CSS_PATH, 'utf8');
  assert.equal(currentJs, originalJs, 'main.js must remain pristine on disk');
  assert.equal(currentCss, originalCss, 'custom-controls.css must remain pristine on disk');

  console.log('\n✅ All assertions passed — R18-T040 PASS');

  // Save evidence.json
  const evidence = {
    task: 'R18-T040',
    page: PAGE_PATH,
    sourceAnchors: ['audio', 'a', 'video'],
    correctBehavior: correctEvidence,
    deliberateEventMutation: eventMutationEvidence,
    deliberateStyleMutation: styleMutationEvidence,
    filesPristine: true,
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
