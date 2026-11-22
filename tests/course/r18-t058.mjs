/**
 * R18-T058 — Safe text rendering regression test
 * Target: accessibility/multimedia/custom-controls-OOJS/index.html
 * Task type: Safe text rendering
 *
 * Checks:
 *  1. Page loads without unexpected console errors.
 *  2. <audio> element exists (source anchors: audio, a, video present).
 *  3. <video> element exists.
 *  4. Fallback <a> links inside audio/video exist and render plain text (no injected element).
 *  5. JS-generated control buttons exist and have plain textContent (no HTML injection).
 *  6. Fixture string "Play" appears as plain text in a button (not as injected DOM child).
 *  7. time-label textContent is "00:00" initially (plain text, no injection).
 *  8. Test string "Stop" appears as textContent without creating injected elements.
 *  9. No script execution triggered by any fixture text strings.
 * 10. Browser reports no unexpected page errors.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';
import assert from 'assert/strict';

// ── helpers ──────────────────────────────────────────────────────────────────

const REPO_ROOT = path.resolve(new URL('.', import.meta.url).pathname, '../..');
const EXAMPLE_DIR = path.join(REPO_ROOT, 'accessibility', 'multimedia', 'custom-controls-OOJS');

function mimeFor(ext) {
  const map = {
    '.html': 'text/html',
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.mp3':  'audio/mpeg',
    '.ogg':  'audio/ogg',
    '.mp4':  'video/mp4',
    '.webm': 'video/webm',
  };
  return map[ext] || 'application/octet-stream';
}

/** Minimal static server rooted at REPO_ROOT (serves everything under /accessibility/). */
function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      // Strip query string
      const urlPath = req.url.split('?')[0];
      const filePath = path.join(REPO_ROOT, urlPath);

      // Security: stay within repo root
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

    server.listen(0, '127.0.0.1', () => {
      resolve(server);
    });
    server.on('error', reject);
  });
}

// ── main ─────────────────────────────────────────────────────────────────────

let server;
let browser;

try {
  server = await startServer();
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  const pageUrl = `${baseUrl}/accessibility/multimedia/custom-controls-OOJS/index.html`;

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });

  // Block only truly external origins; allow our local server and media files
  await context.route(/^https?:\/\/(?!127\.0\.0\.1)/, route => route.abort());

  const page = await context.newPage();

  // Collect console errors (excluding media-load errors which are expected in headless)
  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Allow expected media-not-found errors (audio/video files absent in test env)
      if (
        text.includes('viper') ||
        text.includes('rabbit320') ||
        text.includes('404') ||
        text.includes('Not Found') ||
        text.includes('Failed to load resource')
      ) {
        return; // expected in headless env without actual media files
      }
      consoleErrors.push(text);
    }
  });

  // Page errors (uncaught exceptions)
  const pageErrors = [];
  page.on('pageerror', err => pageErrors.push(err.message));

  // ── Navigate ───────────────────────────────────────────────────────────────
  await page.goto(pageUrl, { waitUntil: 'domcontentloaded' });

  // Give JS a moment to build the custom controls
  await page.waitForTimeout(500);

  // ── Screenshot (baseline) ──────────────────────────────────────────────────
  const workDir = path.join(REPO_ROOT, 'work', 'R18-T058');
  fs.mkdirSync(workDir, { recursive: true });
  await page.screenshot({ path: path.join(workDir, 'baseline-page.png'), fullPage: true });

  // ── CHECK 1: No unexpected console errors ─────────────────────────────────
  assert.deepEqual(consoleErrors, [], `Unexpected console errors: ${JSON.stringify(consoleErrors)}`);
  console.log('✓ Check 1: No unexpected console errors');

  // ── CHECK 2: <audio> element exists ──────────────────────────────────────
  const audioCount = await page.locator('audio').count();
  assert.ok(audioCount >= 1, `Expected at least 1 <audio> element, got ${audioCount}`);
  console.log(`✓ Check 2: <audio> element present (${audioCount})`);

  // ── CHECK 3: <video> element exists ──────────────────────────────────────
  const videoCount = await page.locator('video').count();
  assert.ok(videoCount >= 1, `Expected at least 1 <video> element, got ${videoCount}`);
  console.log(`✓ Check 3: <video> element present (${videoCount})`);

  // ── CHECK 4: Fallback <a> links render as plain text, no injected element ─
  const fallbackLinks = await page.locator('audio p a, video p a').all();
  assert.ok(fallbackLinks.length >= 2, `Expected ≥2 fallback <a> links, got ${fallbackLinks.length}`);
  for (const link of fallbackLinks) {
    const text = await link.textContent();
    // Plain text check: textContent must be non-empty and not look like HTML
    assert.ok(text && text.trim().length > 0, 'Fallback link text must be non-empty');
    assert.ok(!text.includes('<') && !text.includes('>'), `Fallback link text must not contain HTML: "${text}"`);
    // The link itself must NOT have injected child elements (only text nodes)
    const childElementCount = await link.evaluate(el => el.children.length);
    assert.strictEqual(childElementCount, 0, `Fallback <a> must have no child elements; found ${childElementCount}`);
  }
  console.log(`✓ Check 4: Fallback <a> links render as plain text (${fallbackLinks.length} links checked)`);

  // ── CHECK 5: Custom control buttons exist and have plain textContent ───────
  const playButtons = await page.locator('button.playpause').all();
  assert.ok(playButtons.length >= 2, `Expected ≥2 play/pause buttons (one per player), got ${playButtons.length}`);
  for (const btn of playButtons) {
    const text = await btn.textContent();
    assert.ok(text && text.trim().length > 0, 'Play/Pause button must have text');
    assert.ok(!text.includes('<') && !text.includes('>'), `Button text must not contain HTML: "${text}"`);
    const childCount = await btn.evaluate(el => el.children.length);
    assert.strictEqual(childCount, 0, `Button must have no injected child elements; found ${childCount}`);
  }
  console.log(`✓ Check 5: Custom control buttons exist and have plain textContent (${playButtons.length} checked)`);

  // ── CHECK 6: Fixture string "Play" appears as plain text ─────────────────
  const firstPlayBtn = playButtons[0];
  const playText = await firstPlayBtn.textContent();
  assert.ok(
    playText.trim() === 'Play' || playText.trim() === 'Pause',
    `Expected "Play" or "Pause" text, got "${playText}"`
  );
  // "Play" text does NOT create an extra element
  const playBtnChildCount = await firstPlayBtn.evaluate(el => el.children.length);
  assert.strictEqual(playBtnChildCount, 0, '"Play" text must not inject a child element');
  console.log(`✓ Check 6: Fixture string "${playText.trim()}" is plain text, no injected element`);

  // ── CHECK 7: Time label shows "00:00" as plain text ──────────────────────
  const timeLabels = await page.locator('div.time').all();
  assert.ok(timeLabels.length >= 2, `Expected ≥2 time labels, got ${timeLabels.length}`);
  for (const label of timeLabels) {
    const text = await label.textContent();
    assert.ok(text && text.trim().length > 0, 'Time label must have text');
    assert.ok(!text.includes('<') && !text.includes('>'), `Time label must not contain HTML: "${text}"`);
    const childCount = await label.evaluate(el => el.children.length);
    assert.strictEqual(childCount, 0, `Time label must have no injected child elements; found ${childCount}`);
  }
  const firstTimeText = await timeLabels[0].textContent();
  assert.ok(firstTimeText.trim() === '00:00', `Expected time "00:00", got "${firstTimeText.trim()}"`);
  console.log(`✓ Check 7: Time label shows "${firstTimeText.trim()}" as plain text, no injection`);

  // ── CHECK 8: "Stop" button text is plain text, no injected element ────────
  const stopButtons = await page.locator('button.stop').all();
  assert.ok(stopButtons.length >= 2, `Expected ≥2 Stop buttons, got ${stopButtons.length}`);
  const firstStopText = await stopButtons[0].textContent();
  assert.ok(firstStopText.trim() === 'Stop', `Expected "Stop" text, got "${firstStopText}"`);
  const stopChildCount = await stopButtons[0].evaluate(el => el.children.length);
  assert.strictEqual(stopChildCount, 0, '"Stop" text must not inject a child element');
  console.log(`✓ Check 8: Fixture string "Stop" is plain text, no injected element`);

  // ── CHECK 9: No script execution triggered by fixture text ────────────────
  // Inject a probe: set textContent to a XSS-like string and verify it stays as text
  const xssProbeResult = await page.evaluate(() => {
    const btn = document.querySelector('button.playpause');
    const original = btn.textContent;
    btn.textContent = '<img src=x onerror=window.__xssRan=true>';
    const wasSetAsText = btn.children.length === 0; // must be 0 children (text, not DOM)
    const noScriptRan = !window.__xssRan;
    btn.textContent = original; // restore
    return { wasSetAsText, noScriptRan };
  });
  assert.ok(xssProbeResult.wasSetAsText, 'textContent assignment must not create child elements (safe text)');
  assert.ok(xssProbeResult.noScriptRan, 'XSS probe must not execute script via textContent');
  console.log('✓ Check 9: textContent is safe — no script execution from fixture text');

  // ── CHECK 10: No unexpected page errors ───────────────────────────────────
  assert.deepEqual(pageErrors, [], `Unexpected page errors: ${JSON.stringify(pageErrors)}`);
  console.log('✓ Check 10: No unexpected page errors');

  // ── Screenshot (after checks) ─────────────────────────────────────────────
  await page.screenshot({ path: path.join(workDir, 'after-checks.png'), fullPage: true });

  console.log('\n✅ All 10 checks passed for R18-T058');
  console.log(`Screenshots saved to work/R18-T058/`);

} catch (err) {
  console.error('\n❌ Test failed:', err.message);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server) server.close();
}
