import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const root = resolve(import.meta.dirname, '../..');
const require = createRequire(import.meta.url);
const playwrightVersion = require('playwright/package.json').version;
const mimeTypes = {
  '.css': 'text/css; charset=utf-8', '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
};

function serveCheckout() {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const filePath = resolve(root, `.${pathname}`);
      assert(filePath === root || filePath.startsWith(`${root}${sep}`), 'request escaped repository root');
      const body = await readFile(filePath);
      response.writeHead(200, { 'content-type': mimeTypes[extname(filePath)] ?? 'application/octet-stream' });
      response.end(body);
    } catch (error) {
      response.writeHead(error.code === 'ENOENT' ? 404 : 500);
      response.end(error.code === 'ENOENT' ? 'Not found' : 'Local server error');
    }
  });
  return new Promise((resolveServer, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      resolveServer({ server, baseUrl: `http://127.0.0.1:${server.address().port}` });
    });
  });
}

export async function runCourseCheck({ taskId, pagePath, viewports = [{ width: 1280, height: 900 }], contextOptions = {}, prepare = async () => {}, run }) {
  const evidenceDir = resolve(root, `work/${taskId}`);
  await mkdir(evidenceDir, { recursive: true });
  const evidence = {
    task: taskId, input: { pagePath, viewports, contextOptions },
    expected: 'All strict browser assertions pass and no unexpected page errors occur.',
    actual: [], tools: { node: process.version, playwright: playwrightVersion },
  };
  let browser;
  let server;
  let failure;
  try {
    ({ server, baseUrl: evidence.localServer } = await serveCheckout());
    browser = await chromium.launch({ headless: true });
    evidence.tools.chromium = browser.version();
    for (const viewport of viewports) {
      const context = await browser.newContext({ ...contextOptions, viewport });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      try {
        await prepare(page, viewport);
        await page.goto(`${evidence.localServer}/${pagePath}`, { waitUntil: 'load' });
        if (evidence.actual.length === 0) await page.screenshot({ path: resolve(evidenceDir, 'baseline.png'), fullPage: true });
        const observation = await run(page, viewport);
        assert.deepEqual(pageErrors, [], `unexpected page errors: ${pageErrors.join('; ')}`);
        evidence.actual.push({ viewport, observation, pageErrors });
      } catch (error) {
        evidence.actual.push({ viewport, pageErrors, failure: error.message });
        throw error;
      } finally {
        await context.close();
      }
    }
  } catch (error) {
    failure = error;
    evidence.failure = error.stack ?? error.message;
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise((resolveClose) => server.close(resolveClose));
    await writeFile(resolve(evidenceDir, 'evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  }
  if (failure) throw failure;
  console.log(`${taskId}: passed; evidence saved to work/${taskId}/evidence.json`);
}
