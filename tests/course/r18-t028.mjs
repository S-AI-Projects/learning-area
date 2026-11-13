import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const host = '127.0.0.1';
const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const exampleDirectory = resolve(repoRoot, 'tools-testing/cross-browser-testing/automation');
const evidenceDirectory = resolve(repoRoot, 'work/R18-T028');
const issueMarkup =
  '[![](https://github.com/S-AI-Projects/learning-area/issues/x)](https://github.com/S-AI-Projects/learning-area/issues/x)';
const handlerProbe =
  '<img src="/missing-r18-t028.png" onerror="window.__r18HandlerExecutions += 1">';
const inputText = `${issueMarkup} ${handlerProbe}`;
const generatedNames = ['', '1. Chris', '2. Bob', '3. Mark', '4. Paul'];
const pageErrors = [];
const consoleErrors = [];
const unexpectedAssetRequests = [];

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
};
const servedFiles = new Set(['index.html', 'main.js', 'style.css']);

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, `http://${host}`).pathname;
  const filename = pathname === '/' ? 'index.html' : pathname.slice(1);

  if (pathname === '/missing-r18-t028.png') {
    unexpectedAssetRequests.push(pathname);
  }

  if (!servedFiles.has(filename)) {
    response.writeHead(404);
    response.end('Not found');
    return;
  }

  try {
    const body = await readFile(resolve(exampleDirectory, filename));
    response.writeHead(200, {
      'content-type': contentTypes[extname(filename)],
    });
    response.end(body);
  } catch (error) {
    response.writeHead(500);
    response.end('Unable to read example file');
    console.error(error);
  }
});

async function waitForServer(url) {
  const deadline = Date.now() + 5000;

  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        await response.arrayBuffer();
        return;
      }
    } catch {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 50));
    }
  }

  throw new Error(`Local server did not become ready at ${url}`);
}

async function closeServer() {
  if (!server.listening) {
    return;
  }

  await new Promise((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()));
  });
}

let browser;
let context;

try {
  await mkdir(evidenceDirectory, { recursive: true });

  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, host, resolveListen);
  });

  const address = server.address();
  assert(address && typeof address === 'object', 'Local server must have a TCP address');
  const pageUrl = `http://${host}:${address.port}/`;
  await waitForServer(pageUrl);

  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await context.newPage();
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  await page.addInitScript(() => {
    window.__r18HandlerExecutions = 0;
  });
  await page.goto(pageUrl, { waitUntil: 'load' });

  const initialPage = await page.evaluate(() => ({
    title: document.title,
    generatedNames: [...document.querySelectorAll('body > p')].map((paragraph) => paragraph.textContent),
    inputCount: document.querySelectorAll('#text-rendering-form input').length,
    outputText: document.querySelector('#text-output').textContent,
    bodyDisplay: getComputedStyle(document.body).display,
    flexWrap: getComputedStyle(document.body).flexWrap,
  }));
  assert.equal(initialPage.title, 'Arrow function example');
  assert.deepEqual(initialPage.generatedNames, generatedNames);
  assert.equal(initialPage.inputCount, 1);
  assert.equal(initialPage.outputText, '');
  assert.equal(initialPage.bodyDisplay, 'flex');
  assert.equal(initialPage.flexWrap, 'wrap');
  await page.evaluate(() => new Promise(requestAnimationFrame));
  await page.waitForTimeout(100);
  await page.screenshot({ path: resolve(evidenceDirectory, 'after.png'), fullPage: true });

  await page.getByLabel('Text to render').fill(inputText);
  const urlBeforeSubmit = page.url();
  await page.getByRole('button', { name: 'Render text' }).click();
  await page.waitForTimeout(100);

  const rendered = await page.evaluate(() => {
    const output = document.querySelector('#text-output');
    const section = document.querySelector('#text-rendering-example');
    const generatedParagraphs = [...document.querySelectorAll('body > p')];
    const paragraphBottom = Math.max(...generatedParagraphs.map((paragraph) => paragraph.getBoundingClientRect().bottom));
    const sectionRect = section.getBoundingClientRect();

    return {
      inputText: document.querySelector('#user-text').value,
      outputText: output.textContent,
      injectedElementCount: output.querySelectorAll('*').length,
      injectedLinkCount: output.querySelectorAll('a').length,
      injectedImageCount: output.querySelectorAll('img').length,
      handlerExecutions: window.__r18HandlerExecutions,
      bodyDisplay: getComputedStyle(document.body).display,
      flexWrap: getComputedStyle(document.body).flexWrap,
      sectionFlexBasis: getComputedStyle(section).flexBasis,
      sectionTop: sectionRect.top,
      sectionWidth: sectionRect.width,
      paragraphBottom,
      outputWhiteSpace: getComputedStyle(output).whiteSpace,
    };
  });

  assert.equal(inputText.includes(issueMarkup), true, 'Fixture must include the requested issue-link text');
  assert.equal(rendered.inputText, inputText);
  assert.equal(rendered.outputText, inputText, 'Submitted text must be rendered literally');
  assert.equal(rendered.injectedElementCount, 0, 'Output must not contain parsed elements');
  assert.equal(rendered.injectedLinkCount, 0, 'Output must not contain an injected link');
  assert.equal(rendered.injectedImageCount, 0, 'Output must not contain an injected image');
  assert.equal(rendered.handlerExecutions, 0, 'Injected event handlers must not run');
  assert.equal(rendered.bodyDisplay, 'flex');
  assert.equal(rendered.flexWrap, 'wrap');
  assert.equal(rendered.sectionFlexBasis, '100%');
  assert.ok(rendered.sectionWidth > 0, 'Companion region must have a visible layout');
  assert.ok(rendered.sectionTop >= rendered.paragraphBottom, 'Companion region must follow the original example');
  assert.equal(rendered.outputWhiteSpace, 'pre-wrap');
  assert.equal(page.url(), urlBeforeSubmit, 'Submitting text must not navigate away');
  assert.deepEqual(unexpectedAssetRequests, [], 'Text rendering must not request the injected image');
  assert.deepEqual(pageErrors, [], 'Page must not report uncaught errors');
  assert.deepEqual(consoleErrors, [], 'Page must not report console errors');

  const report = {
    status: 'passed',
    baseline: {
      title: 'Arrow function example',
      generatedNames,
      paragraphCount: generatedNames.length,
      inputCount: 0,
      bodyDisplay: 'flex',
      pageErrors: [],
    },
    changed: {
      generatedNames: initialPage.generatedNames,
      inputText,
      expectedOutputText: inputText,
      actualOutputText: rendered.outputText,
      injectedElementCount: rendered.injectedElementCount,
      handlerExecutions: rendered.handlerExecutions,
      layout: rendered,
      pageErrors,
      consoleErrors,
      unexpectedAssetRequests,
    },
    versions: {
      node: process.version,
      playwright: (await import('playwright/package.json', { with: { type: 'json' } })).default.version,
      chromium: browser.version(),
    },
  };
  await writeFile(
    resolve(evidenceDirectory, 'results.json'),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  try {
    if (context) {
      await context.close();
    }
  } finally {
    try {
      if (browser) {
        await browser.close();
      }
    } finally {
      await closeServer();
    }
  }
}
