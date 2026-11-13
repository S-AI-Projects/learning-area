import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { chromium } from 'playwright';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(scriptDirectory, '../..');
const targetDirectory = path.join(projectRoot, 'javascript/oojs/assessment');
const evidenceDirectory = path.join(projectRoot, 'work/R18-T026');
const viewport = { width: 960, height: 720 };
const require = createRequire(import.meta.url);
const playwrightVersion = require('playwright/package.json').version;

const inputs = {
  page: 'javascript/oojs/assessment/index.html',
  viewport,
  scenarios: [
    'Canvas 2D context available',
    'HTMLCanvasElement.getContext returns null',
    'HTMLCanvasElement.getContext is unavailable',
  ],
  keyboard: ['d'],
};

const expected = {
  supported: {
    heading: 'bouncing balls',
    ballCount: 25,
    canvasSize: viewport,
    initialFrame: { fillRectCalls: 1, filledBallArcs: 25, strokedEvilCircleArcs: 1 },
    keyboard: { key: 'd', evilCircleMovement: { x: 20, y: 0 } },
    pageErrors: [],
  },
  unsupported: {
    message: 'This demo needs the Canvas 2D API, which is not supported in this browser.',
    canvasHidden: true,
    pageErrors: [],
  },
};

const baseline = {
  viewport: { width: 900, height: 700 },
  supported: {
    heading: 'bouncing balls',
    paragraph: 'Ball count: 25',
    canvas: { width: 900, height: 700, hidden: false, contextAvailable: true },
    pageErrors: [],
  },
  unsupportedNullContext: {
    paragraph: 'Ball count: 25',
    canvas: { width: 900, height: 700, hidden: false },
    pageErrors: ["Cannot set properties of null (setting 'fillStyle')"],
  },
};

const results = {};
let browser;
let server;
let origin;

async function writeEvidence() {
  await mkdir(evidenceDirectory, { recursive: true });
  await Promise.all([
    writeFile(path.join(evidenceDirectory, 'inputs.json'), `${JSON.stringify(inputs, null, 2)}\n`),
    writeFile(path.join(evidenceDirectory, 'expected.json'), `${JSON.stringify(expected, null, 2)}\n`),
    writeFile(path.join(evidenceDirectory, 'baseline.json'), `${JSON.stringify(baseline, null, 2)}\n`),
    writeFile(path.join(evidenceDirectory, 'actual.json'), `${JSON.stringify(results, null, 2)}\n`),
  ]);
}

function serveAssessment() {
  return createServer(async (request, response) => {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const filePath = path.resolve(targetDirectory, `.${decodeURIComponent(pathname)}`);

    if (!filePath.startsWith(`${targetDirectory}${path.sep}`)) {
      response.writeHead(400).end('Bad request');
      return;
    }

    const contentTypes = {
      '.css': 'text/css',
      '.html': 'text/html',
      '.js': 'text/javascript',
    };

    try {
      const contents = await readFile(filePath);
      response.writeHead(200, {
        'content-type': contentTypes[path.extname(filePath)] ?? 'application/octet-stream',
      });
      response.end(contents);
    } catch (error) {
      if (error.code === 'ENOENT') {
        response.writeHead(404).end('Not found');
        return;
      }

      response.writeHead(500).end('Server error');
      throw error;
    }
  });
}

async function startServer() {
  server = serveAssessment();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  origin = `http://127.0.0.1:${server.address().port}`;

  const readyResponse = await fetch(`${origin}/index.html`);
  assert.equal(readyResponse.status, 200, 'local server should serve the assessment page');
}

async function trackPageErrors(page) {
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  return pageErrors;
}

async function installCanvasInstrumentation(page) {
  await page.addInitScript(() => {
    let seed = 123456789;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    window.__frameQueue = [];
    window.requestAnimationFrame = (callback) => {
      window.__frameQueue.push(callback);
      return window.__frameQueue.length;
    };

    window.__canvasTrace = {
      fillRectCalls: 0,
      filledBallArcs: 0,
      strokedEvilCircleArcs: [],
    };

    const prototype = CanvasRenderingContext2D.prototype;
    const originalArc = prototype.arc;
    const originalFillRect = prototype.fillRect;

    prototype.arc = function (...args) {
      if (this.lineWidth === 3) {
        window.__canvasTrace.strokedEvilCircleArcs.push({ x: args[0], y: args[1] });
      } else {
        window.__canvasTrace.filledBallArcs++;
      }
      return originalArc.apply(this, args);
    };
    prototype.fillRect = function (...args) {
      window.__canvasTrace.fillRectCalls++;
      return originalFillRect.apply(this, args);
    };
  });
}

async function runSupportedScenario() {
  const context = await browser.newContext({ viewport });
  try {
    const page = await context.newPage();
    const pageErrors = await trackPageErrors(page);
    await installCanvasInstrumentation(page);
    await page.goto(`${origin}/index.html`, { waitUntil: 'load' });

    const initial = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      const context2d = canvas.getContext('2d');
      const rect = canvas.getBoundingClientRect();
      return {
        title: document.title,
        heading: document.querySelector('h1').textContent,
        paragraph: document.querySelector('p').textContent,
        canvas: {
          width: canvas.width,
          height: canvas.height,
          hidden: canvas.hidden,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          contextAvailable: Boolean(context2d),
        },
        trace: {
          fillRectCalls: window.__canvasTrace.fillRectCalls,
          filledBallArcs: window.__canvasTrace.filledBallArcs,
          strokedEvilCircleArcs: window.__canvasTrace.strokedEvilCircleArcs,
        },
      };
    });

    assert.equal(initial.title, 'Bouncing balls');
    assert.equal(initial.heading, expected.supported.heading);
    assert.equal(initial.paragraph, `Ball count: ${expected.supported.ballCount}`);
    assert.deepEqual(initial.canvas, {
      width: viewport.width,
      height: viewport.height,
      hidden: false,
      rect: { x: 0, y: 0, width: viewport.width, height: viewport.height },
      contextAvailable: true,
    });
    assert.equal(initial.trace.fillRectCalls, expected.supported.initialFrame.fillRectCalls);
    assert.equal(initial.trace.filledBallArcs, expected.supported.initialFrame.filledBallArcs);
    assert.equal(initial.trace.strokedEvilCircleArcs.length, expected.supported.initialFrame.strokedEvilCircleArcs);

    const beforeKey = initial.trace.strokedEvilCircleArcs.at(-1);
    await page.keyboard.press('d');
    await page.evaluate(() => window.__frameQueue.shift()(performance.now()));

    const afterKey = await page.evaluate(() => ({
      position: window.__canvasTrace.strokedEvilCircleArcs.at(-1),
      fillRectCalls: window.__canvasTrace.fillRectCalls,
      frameQueueLength: window.__frameQueue.length,
      paragraph: document.querySelector('p').textContent,
    }));

    assert.deepEqual(
      { x: afterKey.position.x - beforeKey.x, y: afterKey.position.y - beforeKey.y },
      expected.supported.keyboard.evilCircleMovement,
      'pressing D should move the white circle 20 pixels to the right',
    );
    assert.equal(afterKey.fillRectCalls, 2, 'the next animation frame should render');
    assert.equal(afterKey.frameQueueLength, 1, 'the animation loop should schedule another frame');
    assert.match(afterKey.paragraph, /^Ball count: \d+$/);
    assert.deepEqual(pageErrors, expected.supported.pageErrors);

    results.supported = { initial, afterKey, pageErrors };
  } finally {
    await context.close();
  }
}

async function runUnsupportedScenario(stub) {
  const context = await browser.newContext({ viewport });
  try {
    await context.addInitScript((mode) => {
      if (mode === 'null') {
        HTMLCanvasElement.prototype.getContext = function () {
          return null;
        };
      } else {
        Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
          configurable: true,
          value: undefined,
        });
      }
    }, stub);
    const page = await context.newPage();
    const pageErrors = await trackPageErrors(page);
    await page.goto(`${origin}/index.html`, { waitUntil: 'load' });

    const actual = await page.evaluate(() => {
      const paragraph = document.querySelector('p');
      const canvas = document.querySelector('canvas');
      const rect = canvas.getBoundingClientRect();
      return {
        heading: document.querySelector('h1').textContent,
        message: paragraph.textContent,
        role: paragraph.getAttribute('role'),
        hidden: canvas.hidden,
        canvasDisplay: getComputedStyle(canvas).display,
        canvasRect: { width: rect.width, height: rect.height },
        messageRect: (() => {
          const messageRect = paragraph.getBoundingClientRect();
          return {
            x: messageRect.x,
            y: messageRect.y,
            width: messageRect.width,
            height: messageRect.height,
          };
        })(),
        bodyBackground: getComputedStyle(document.body).backgroundColor,
        paragraphColor: getComputedStyle(paragraph).color,
      };
    });

    assert.equal(actual.message, expected.unsupported.message);
    assert.equal(actual.role, 'status');
    assert.equal(actual.hidden, expected.unsupported.canvasHidden);
    assert.equal(actual.canvasDisplay, 'none');
    assert.deepEqual(actual.canvasRect, { width: 0, height: 0 });
    assert.ok(
      Math.abs(actual.messageRect.x + actual.messageRect.width / 2 - viewport.width / 2) < 1,
      'fallback text should be centered horizontally',
    );
    assert.ok(
      Math.abs(actual.messageRect.y + actual.messageRect.height / 2 - viewport.height / 2) < 1,
      'fallback text should be centered vertically',
    );
    assert.equal(actual.bodyBackground, 'rgb(17, 17, 17)');
    assert.equal(actual.paragraphColor, 'rgb(255, 255, 255)');
    assert.deepEqual(pageErrors, expected.unsupported.pageErrors);
    results[stub === 'null' ? 'unsupportedNullContext' : 'unsupportedMissingMethod'] = {
      ...actual,
      pageErrors,
    };
  } finally {
    await context.close();
  }
}

async function main() {
  await mkdir(evidenceDirectory, { recursive: true });
  const npmVersion = spawnSync('npm', ['--version'], { encoding: 'utf8' }).stdout.trim();
  const versions = {
    node: process.version,
    npm: npmVersion,
    playwright: playwrightVersion,
    platform: process.platform,
    architecture: process.arch,
  };
  await writeFile(path.join(evidenceDirectory, 'versions.json'), `${JSON.stringify(versions, null, 2)}\n`);
  await writeEvidence();

  try {
    await startServer();
    browser = await chromium.launch({ headless: true });
    versions.chromium = browser.version();
    await writeFile(path.join(evidenceDirectory, 'versions.json'), `${JSON.stringify(versions, null, 2)}\n`);

    await runSupportedScenario();
    await runUnsupportedScenario('null');
    await runUnsupportedScenario('missing');
    results.result = 'passed';
    await writeEvidence();
    console.log('R18-T026 Canvas 2D regression passed.');
  } catch (error) {
    results.result = 'failed';
    results.error = error.message;
    await writeEvidence();
    throw error;
  } finally {
    if (browser) {
      await browser.close();
    }
    if (server?.listening) {
      await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  }
}

await main();
