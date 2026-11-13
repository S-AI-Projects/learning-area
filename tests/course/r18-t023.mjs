import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(scriptDir, '../..');
const siteRoot = path.join(repositoryRoot, 'tools-testing/cross-browser-testing/automation');
const evidenceDir = path.join(repositoryRoot, 'work/R18-T023');
const inputs = JSON.parse(await readFile(path.join(evidenceDir, 'inputs.json'), 'utf8'));
const expected = JSON.parse(await readFile(path.join(evidenceDir, 'expected.json'), 'utf8'));
const diagramFixture = await readFile(path.join(repositoryRoot, inputs.restoredAsset));
const mimeTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
};

const server = createServer((request, response) => {
  if (request.method !== 'GET') {
    response.writeHead(405).end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
  } catch {
    response.writeHead(400).end();
    return;
  }

  const filePath = path.resolve(siteRoot, `.${pathname}`);
  if (!filePath.startsWith(`${siteRoot}${path.sep}`)) {
    response.writeHead(403).end();
    return;
  }

  readFile(filePath).then(
    (contents) => {
      response.writeHead(200, {
        'content-type': mimeTypes[path.extname(filePath)] ?? 'application/octet-stream',
      }).end(contents);
    },
    () => response.writeHead(404).end(),
  );
});

async function waitForServer(url) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(1_000) });
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error('Local HTTP server did not become ready.');
}

async function readPageState(page) {
  const fallback = page.locator('#diagram-fallback');
  const image = page.locator('.flow-diagram img');
  const state = await page.evaluate(() => {
    const items = [...document.querySelectorAll('.results > p')];
    const rectangles = items.map((item) => {
      const { x, width } = item.getBoundingClientRect();
      return { x: Math.round(x), width: Math.round(width) };
    });

    return {
      title: document.title,
      names: items.map((item) => item.textContent.trim()),
      layout: {
        display: getComputedStyle(document.querySelector('.results')).display,
        itemCount: items.length,
        rectangles,
      },
    };
  });

  return {
    ...state,
    fallbackVisible: await fallback.isVisible(),
    fallbackText: (await fallback.textContent()).trim(),
    image: await image.evaluate((element) => ({
      complete: element.complete,
      naturalWidth: element.naturalWidth,
      alt: element.alt,
    })),
  };
}

const actual = {
  serverReady: false,
  assetResponseStatuses: [],
  pageErrors: [],
  consoleErrors: [],
};
let browser;
let context;
let failure;
let baseUrl;
let fixtureRestored = false;

try {
  await mkdir(evidenceDir, { recursive: true });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  baseUrl = `http://127.0.0.1:${server.address().port}`;
  await waitForServer(`${baseUrl}/index.html`);
  actual.serverReady = true;

  browser = await chromium.launch({ headless: true });
  actual.toolVersions = {
    node: process.version,
    npm: execFileSync('npm', ['--version'], { encoding: 'utf8' }).trim(),
    playwright: JSON.parse(await readFile(path.join(scriptDir, 'node_modules/playwright/package.json'), 'utf8')).version,
    chromium: browser.version(),
  };
  context = await browser.newContext({ viewport: inputs.viewport });
  const page = await context.newPage();
  const pageUrl = `${baseUrl}/index.html`;
  const diagramPath = new URL(inputs.failedAsset.path, `${baseUrl}/`).pathname;
  page.on('pageerror', (error) => actual.pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      actual.consoleErrors.push({
        text: message.text(),
        url: message.location().url,
      });
    }
  });
  page.on('response', (response) => {
    if (new URL(response.url()).pathname === diagramPath) {
      actual.assetResponseStatuses.push(response.status());
    }
  });
  await page.route(`**/${path.basename(inputs.failedAsset.path)}`, async (route) => {
    if (fixtureRestored) {
      await route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        body: diagramFixture,
      });
      return;
    }

    await route.fulfill({
      status: inputs.failedAsset.status,
      contentType: 'text/plain',
      body: inputs.failedAsset.body,
    });
  });

  await page.goto(pageUrl, { waitUntil: 'networkidle' });
  await page.locator('#diagram-fallback').waitFor({ state: 'visible' });
  actual.failedAssetState = await readPageState(page);
  await page.screenshot({
    path: path.join(evidenceDir, 'failed-diagram.png'),
    fullPage: true,
  });

  fixtureRestored = true;
  await page.reload({ waitUntil: 'networkidle' });
  await page.locator('#diagram-fallback').waitFor({ state: 'hidden' });
  actual.restoredFixtureState = await readPageState(page);
  await page.screenshot({
    path: path.join(evidenceDir, 'restored-diagram.png'),
    fullPage: true,
  });

  actual.expectedNetworkConsoleErrors = actual.consoleErrors.filter(({ text }) =>
    /failed to load resource|net::err_/i.test(text),
  );
  actual.unexpectedConsoleErrors = actual.consoleErrors.filter(({ text }) =>
    !/failed to load resource|net::err_/i.test(text),
  );

  assert.equal(actual.serverReady, true, 'the local server should be ready before navigation');
  assert.deepEqual(actual.assetResponseStatuses, [
    expected.failedAssetStatus,
    expected.restoredAssetStatus,
  ]);
  assert.deepEqual(actual.failedAssetState.names, expected.names);
  assert.equal(actual.failedAssetState.title, expected.title);
  assert.equal(actual.failedAssetState.image.complete, true);
  assert.equal(actual.failedAssetState.image.naturalWidth, 0);
  assert.equal(actual.failedAssetState.image.alt, expected.imageAlt);
  assert.equal(actual.failedAssetState.fallbackVisible, true);
  assert.equal(actual.failedAssetState.fallbackText, expected.fallbackText);
  assert.equal(actual.failedAssetState.layout.display, 'flex');
  assert.equal(actual.failedAssetState.layout.itemCount, expected.names.length);

  const failedWidths = actual.failedAssetState.layout.rectangles.map(({ width }) => width);
  const failedPositions = actual.failedAssetState.layout.rectangles.map(({ x }) => x);
  assert.ok(failedWidths.every((width) => width > 0), 'all rendered names should have visible width');
  assert.ok(
    Math.max(...failedWidths) - Math.min(...failedWidths) <= 1,
    'the flex items should have equal computed widths',
  );
  assert.ok(
    failedPositions.every((position, index) => index === 0 || position > failedPositions[index - 1]),
    'the names should appear in left-to-right order',
  );

  assert.deepEqual(actual.restoredFixtureState.names, expected.names);
  assert.equal(actual.restoredFixtureState.image.complete, true);
  assert.equal(actual.restoredFixtureState.image.naturalWidth, expected.restoredImageWidth);
  assert.equal(actual.restoredFixtureState.fallbackVisible, false);
  assert.equal(actual.restoredFixtureState.layout.itemCount, expected.names.length);
  assert.deepEqual(actual.pageErrors, [], 'no uncaught page errors should occur');
  assert.deepEqual(
    actual.unexpectedConsoleErrors,
    [],
    'only browser console errors caused by the intentionally missing image are allowed',
  );
} catch (error) {
  failure = error;
  actual.failure = {
    name: error.name,
    message: error.message,
    stack: error.stack,
  };
} finally {
  await context?.close();
  await browser?.close();
  if (server.listening) {
    await new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections();
    });
  }
  actual.pageUrl = baseUrl ? `${baseUrl}/index.html` : null;
  await writeFile(path.join(evidenceDir, 'actual.json'), `${JSON.stringify(actual, null, 2)}\n`);
  if (actual.toolVersions) {
    await writeFile(
      path.join(evidenceDir, 'tool-versions.json'),
      `${JSON.stringify(actual.toolVersions, null, 2)}\n`,
    );
  }
}

if (failure) {
  console.error(failure);
  process.exitCode = 1;
} else {
  console.log(`R18-T023 passed; evidence written to ${path.relative(repositoryRoot, evidenceDir)}/`);
}
