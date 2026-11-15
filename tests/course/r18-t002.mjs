/**
 * R18-T002 — Layout regression test for json1.html
 *
 * Protects the page layout at two viewport sizes: 360×800 and 1280×800.
 * Validates:
 *   - No unexpected horizontal overflow
 *   - All interactive controls (#reset button) are fully visible and not clipped
 *   - Content elements fit within the viewport width
 *   - The textarea is an intentional scrollable region (overflow: auto)
 *   - No unexpected page errors (ignores the known eval/re-declaration error)
 *   - Viewport meta tag is present
 *
 * Run:  node tests/course/r18-t002.mjs
 */

import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const TARGET = '/javascript/oojs/tasks/json/json1.html';
const PORT = 8788;

const VIEWPORTS = [
  { name: '360x800', width: 360, height: 800 },
  { name: '1280x800', width: 1280, height: 800 },
];

// Known error from playable.js eval() re-declaring 'section' — not a layout issue
const KNOWN_ERRORS = [
  "Identifier 'section' has already been declared",
];

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (filePath.endsWith('/')) filePath += 'index.html';
      const ext = path.extname(filePath);
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
        } else {
          res.writeHead(200, { 'Content-Type': mime });
          res.end(data);
        }
      });
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

function isKnownError(msg) {
  return KNOWN_ERRORS.some(known => msg.includes(known));
}

let passed = 0;
let failed = 0;
const failures = [];

function ok(condition, message) {
  if (condition) {
    passed++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failed++;
    failures.push(message);
    console.log(`  ❌ FAIL: ${message}`);
  }
}

async function testViewport(browser, vp) {
  console.log(`\n🔍 Testing viewport ${vp.name} (${vp.width}×${vp.height})`);
  console.log('─'.repeat(50));

  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push(e.message));

  await page.goto(`http://127.0.0.1:${PORT}${TARGET}`, { waitUntil: 'load' });
  // Wait for playable.js to initialise (fillCode runs on 'load')
  await page.waitForTimeout(1500);

  // ── 1. Viewport meta tag ──────────────────────────────────────────
  const hasViewportMeta = await page.evaluate(() => {
    const meta = document.querySelector('meta[name="viewport"]');
    return meta !== null && meta.content.includes('width=device-width');
  });
  ok(hasViewportMeta, `[${vp.name}] Viewport meta tag is present with width=device-width`);

  // ── 2. No horizontal overflow ─────────────────────────────────────
  const docMetrics = await page.evaluate(() => {
    const de = document.documentElement;
    return {
      scrollWidth: de.scrollWidth,
      clientWidth: de.clientWidth,
    };
  });
  ok(
    docMetrics.scrollWidth <= docMetrics.clientWidth,
    `[${vp.name}] No horizontal overflow (scrollWidth=${docMetrics.scrollWidth}, clientWidth=${docMetrics.clientWidth})`
  );

  // ── 3. Key elements exist ─────────────────────────────────────────
  const elements = await page.evaluate(() => {
    const section = document.querySelector('section.preview');
    const textarea = document.querySelector('textarea.playable');
    const buttons = document.querySelector('.playable-buttons');
    const resetBtn = document.getElementById('reset');
    return {
      sectionExists: !!section,
      textareaExists: !!textarea,
      buttonsExists: !!buttons,
      resetExists: !!resetBtn,
    };
  });
  ok(elements.sectionExists, `[${vp.name}] section.preview exists`);
  ok(elements.textareaExists, `[${vp.name}] textarea.playable exists`);
  ok(elements.buttonsExists, `[${vp.name}] .playable-buttons exists`);
  ok(elements.resetExists, `[${vp.name}] #reset button exists`);

  // ── 4. Elements fit within viewport width ─────────────────────────
  const rects = await page.evaluate(() => {
    const vw = window.innerWidth;
    const get = sel => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
    };
    return {
      viewportWidth: vw,
      section: get('section.preview'),
      textarea: get('textarea.playable'),
      buttons: get('.playable-buttons'),
      resetBtn: get('#reset'),
    };
  });

  const vw = rects.viewportWidth;

  if (rects.section) {
    ok(rects.section.right <= vw + 1, `[${vp.name}] section.preview fits within viewport (right=${rects.section.right.toFixed(1)}, vw=${vw})`);
    ok(rects.section.left >= 0, `[${vp.name}] section.preview not clipped on left (left=${rects.section.left.toFixed(1)})`);
  }

  if (rects.textarea) {
    ok(rects.textarea.right <= vw + 1, `[${vp.name}] textarea fits within viewport (right=${rects.textarea.right.toFixed(1)}, vw=${vw})`);
    ok(rects.textarea.left >= 0, `[${vp.name}] textarea not clipped on left (left=${rects.textarea.left.toFixed(1)})`);
  }

  if (rects.buttons) {
    ok(rects.buttons.right <= vw + 1, `[${vp.name}] .playable-buttons fits within viewport (right=${rects.buttons.right.toFixed(1)}, vw=${vw})`);
  }

  // ── 5. #reset button fully visible and not clipped ────────────────
  if (rects.resetBtn) {
    ok(rects.resetBtn.right <= vw + 1, `[${vp.name}] #reset button not clipped on right (right=${rects.resetBtn.right.toFixed(1)}, vw=${vw})`);
    ok(rects.resetBtn.left >= 0, `[${vp.name}] #reset button not clipped on left (left=${rects.resetBtn.left.toFixed(1)})`);
    ok(rects.resetBtn.width > 10, `[${vp.name}] #reset button has reasonable width (${rects.resetBtn.width.toFixed(1)}px)`);
    ok(rects.resetBtn.height > 10, `[${vp.name}] #reset button has reasonable height (${rects.resetBtn.height.toFixed(1)}px)`);
  }

  // ── 6. Textarea is an intentional scrollable region ───────────────
  const textareaOverflow = await page.evaluate(() => {
    const ta = document.querySelector('textarea.playable');
    if (!ta) return null;
    const cs = getComputedStyle(ta);
    return { overflow: cs.overflow, overflowX: cs.overflowX, overflowY: cs.overflowY };
  });
  if (textareaOverflow) {
    ok(
      ['auto', 'scroll'].includes(textareaOverflow.overflow) ||
      ['auto', 'scroll'].includes(textareaOverflow.overflowY),
      `[${vp.name}] Textarea preserves intentional scroll region (overflow=${textareaOverflow.overflow})`
    );
  }

  // ── 7. Content order: section → textarea → buttons ────────────────
  if (rects.section && rects.textarea && rects.buttons) {
    ok(
      rects.section.top < rects.textarea.top && rects.textarea.top < rects.buttons.top,
      `[${vp.name}] Content order preserved: section (y=${rects.section.top.toFixed(0)}) → textarea (y=${rects.textarea.top.toFixed(0)}) → buttons (y=${rects.buttons.top.toFixed(0)})`
    );
  }

  // ── 8. No unexpected page errors ──────────────────────────────────
  const unexpectedErrors = pageErrors.filter(e => !isKnownError(e));
  ok(
    unexpectedErrors.length === 0,
    `[${vp.name}] No unexpected page errors${unexpectedErrors.length > 0 ? ': ' + unexpectedErrors.join('; ') : ''}`
  );

  // ── 9. At 1280, elements should hit max-width 700px ───────────────
  if (vp.width >= 1280 && rects.section) {
    ok(
      rects.section.width <= 700 + 1,
      `[${vp.name}] section.preview respects max-width: 700px (actual=${rects.section.width.toFixed(1)}px)`
    );
  }
  if (vp.width >= 1280 && rects.textarea) {
    ok(
      rects.textarea.width <= 700 + 1,
      `[${vp.name}] textarea respects max-width: 700px (actual=${rects.textarea.width.toFixed(1)}px)`
    );
  }

  await context.close();
}

async function main() {
  const server = await startServer();
  console.log(`Server started on http://127.0.0.1:${PORT}`);
  console.log(`Target: ${TARGET}`);
  console.log('═'.repeat(50));

  let browser;
  try {
    browser = await chromium.launch({ headless: true });

    for (const vp of VIEWPORTS) {
      await testViewport(browser, vp);
    }

    console.log('\n' + '═'.repeat(50));
    console.log(`\nResults: ${passed} passed, ${failed} failed, ${passed + failed} total`);

    if (failures.length > 0) {
      console.log('\nFailures:');
      for (const f of failures) {
        console.log(`  ❌ ${f}`);
      }
    }

    if (failed > 0) {
      process.exitCode = 1;
    }
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
