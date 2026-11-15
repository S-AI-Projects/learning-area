/**
 * Post-change evidence capture for R18-T002
 * Takes screenshots at both viewports after the viewport meta tag fix.
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
const PORT = 8789;

const VIEWPORTS = [
  { name: '360x800', width: 360, height: 800 },
  { name: '1280x800', width: 1280, height: 800 },
];

const MIME_TYPES = {
  '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
  '.json': 'application/json', '.png': 'image/png',
};

function startServer() {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (filePath.endsWith('/')) filePath += 'index.html';
      const ext = path.extname(filePath);
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); }
        else { res.writeHead(200, { 'Content-Type': mime }); res.end(data); }
      });
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
    server.on('error', reject);
  });
}

async function main() {
  const server = await startServer();
  const browser = await chromium.launch({ headless: true });
  try {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await ctx.newPage();
      await page.goto(`http://127.0.0.1:${PORT}${TARGET}`, { waitUntil: 'load' });
      await page.waitForTimeout(1500);
      const out = path.join(EVIDENCE_DIR, `after-fix-${vp.name}.png`);
      await page.screenshot({ path: out, fullPage: true });
      console.log(`Saved: ${out}`);
      await ctx.close();
    }
  } finally {
    await browser.close();
    server.close();
  }
}

main().catch(e => { console.error(e); process.exit(1); });
