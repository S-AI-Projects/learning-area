/**
 * Baseline inspection script for R18-T002
 * Captures layout metrics at 360x800 and 1280x800 BEFORE any changes.
 */
import { chromium } from 'playwright';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const TARGET = '/javascript/oojs/tasks/json/json1.html';
const EVIDENCE_DIR = path.resolve(__dirname);
const PORT = 8787;

const VIEWPORTS = [
  { name: '360x800', width: 360, height: 800 },
  { name: '1280x800', width: 1280, height: 800 },
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

async function inspectViewport(browser, vp) {
  const context = await browser.newContext({
    viewport: { width: vp.width, height: vp.height },
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  await page.goto(`http://127.0.0.1:${PORT}${TARGET}`, { waitUntil: 'load' });
  // Wait for JS to execute (playable.js runs on load)
  await page.waitForTimeout(1500);

  // Gather layout metrics
  const metrics = await page.evaluate(() => {
    const body = document.body;
    const docEl = document.documentElement;
    const section = document.querySelector('section.preview');
    const textarea = document.querySelector('textarea.playable');
    const buttons = document.querySelector('.playable-buttons');
    const resetBtn = document.getElementById('reset');

    function getMetrics(el, label) {
      if (!el) return { label, exists: false };
      const rect = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return {
        label,
        exists: true,
        rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
        scrollWidth: el.scrollWidth,
        clientWidth: el.clientWidth,
        offsetWidth: el.offsetWidth,
        overflow: cs.overflow,
        overflowX: cs.overflowX,
        overflowY: cs.overflowY,
        display: cs.display,
        boxSizing: cs.boxSizing,
        width: cs.width,
        maxWidth: cs.maxWidth,
        padding: cs.padding,
        margin: cs.margin,
        // Check if clipped (right edge extends past viewport)
        clippedRight: rect.right > window.innerWidth,
        clippedBottom: rect.bottom > window.innerHeight,
      };
    }

    const hasHorizontalOverflow = docEl.scrollWidth > docEl.clientWidth;
    const overflowAmount = docEl.scrollWidth - docEl.clientWidth;

    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      documentScroll: {
        scrollWidth: docEl.scrollWidth,
        clientWidth: docEl.clientWidth,
        scrollHeight: docEl.scrollHeight,
        clientHeight: docEl.clientHeight,
        hasHorizontalOverflow,
        overflowAmount,
      },
      body: getMetrics(body, 'body'),
      section: getMetrics(section, 'section.preview'),
      textarea: getMetrics(textarea, 'textarea.playable'),
      buttons: getMetrics(buttons, '.playable-buttons'),
      resetBtn: getMetrics(resetBtn, '#reset'),
    };
  });

  // Take screenshot
  const screenshotPath = path.join(EVIDENCE_DIR, `baseline-${vp.name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  await context.close();
  return { viewport: vp.name, metrics, errors, screenshotPath };
}

async function main() {
  const server = await startServer();
  console.log(`Server listening on http://127.0.0.1:${PORT}`);

  let browser;
  try {
    browser = await chromium.launch({ headless: true });

    const results = [];
    for (const vp of VIEWPORTS) {
      console.log(`\nInspecting viewport ${vp.name}...`);
      const result = await inspectViewport(browser, vp);
      results.push(result);

      console.log(`  Document scroll: ${JSON.stringify(result.metrics.documentScroll)}`);
      console.log(`  Section: ${JSON.stringify(result.metrics.section.rect)}`);
      console.log(`  Textarea: ${JSON.stringify(result.metrics.textarea.rect)}`);
      console.log(`  Buttons: ${JSON.stringify(result.metrics.buttons.rect)}`);
      console.log(`  Reset btn: ${JSON.stringify(result.metrics.resetBtn.rect)}`);
      console.log(`  Page errors: ${result.errors.length ? result.errors.join('; ') : 'none'}`);

      if (result.metrics.documentScroll.hasHorizontalOverflow) {
        console.log(`  ⚠️  HORIZONTAL OVERFLOW: ${result.metrics.documentScroll.overflowAmount}px`);
      } else {
        console.log(`  ✅ No horizontal overflow`);
      }

      if (result.metrics.resetBtn.exists && result.metrics.resetBtn.clippedRight) {
        console.log(`  ⚠️  RESET BUTTON CLIPPED (extends past viewport right)`);
      } else if (result.metrics.resetBtn.exists) {
        console.log(`  ✅ Reset button fully visible`);
      }

      if (result.metrics.textarea.exists && result.metrics.textarea.clippedRight) {
        console.log(`  ⚠️  TEXTAREA CLIPPED`);
      }

      if (result.metrics.section.exists && result.metrics.section.clippedRight) {
        console.log(`  ⚠️  SECTION CLIPPED`);
      }
    }

    // Write full results
    const reportPath = path.join(EVIDENCE_DIR, 'baseline-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`\nBaseline report saved to: ${reportPath}`);
  } finally {
    if (browser) await browser.close();
    server.close();
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
