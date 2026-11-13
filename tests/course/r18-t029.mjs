import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const exampleDirectory = join(repoRoot, 'javascript/oojs/json');
const evidenceDirectory = join(repoRoot, 'work/R18-T029');
const resources = new Map([
  ['/javascript/oojs/json/heroes.html', join(exampleDirectory, 'heroes.html')],
  ['/javascript/oojs/json/style.css', join(exampleDirectory, 'style.css')],
]);
const viewports = [
  { name: 'narrow', width: 375, height: 800, expectedBodyX: 16, expectedBodyWidth: 343 },
  { name: 'desktop', width: 1280, height: 800, expectedBodyX: 240, expectedBodyWidth: 800 },
];
const actual = {
  nodeVersion: process.version,
  playwrightVersion: '',
  chromiumVersion: '',
  testedViewports: [],
};
const require = createRequire(import.meta.url);
const playwrightPackage = JSON.parse(
  readFileSync(join(dirname(require.resolve('playwright')), 'package.json'), 'utf8'),
);
actual.playwrightVersion = playwrightPackage.version;

let server;
let browser;
let failure;

async function waitForServer(url) {
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    let response;
    try {
      response = await fetch(url);
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
      continue;
    }

    if (response.ok) {
      return;
    }

    throw new Error(`Local example server returned HTTP ${response.status} at ${url}`);
  }

  throw new Error(`Local example server did not become ready at ${url}`);
}

async function main() {
  server = createServer(async (request, response) => {
    const resource = resources.get(new URL(request.url, 'http://localhost').pathname);
    if (!resource) {
      response.writeHead(404).end('Not found');
      return;
    }

    try {
      const body = await readFile(resource);
      response.writeHead(200, {
        'Content-Type': resource.endsWith('.css') ? 'text/css; charset=utf-8' : 'text/html; charset=utf-8',
      });
      response.end(body);
    } catch (error) {
      response.writeHead(500).end('Unable to read example resource');
      console.error(`Unable to serve ${resource}:`, error);
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const pageUrl = `${baseUrl}/javascript/oojs/json/heroes.html`;
  await waitForServer(pageUrl);
  browser = await chromium.launch({ headless: true });
  actual.chromiumVersion = browser.version();

  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      reducedMotion: 'reduce',
    });

    try {
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      await page.route('https://fonts.googleapis.com/**', (route) =>
        route.fulfill({ status: 200, contentType: 'text/css', body: '' }),
      );
      await page.goto(pageUrl, { waitUntil: 'networkidle' });

      const initialState = await page.evaluate(() => {
        const body = document.body.getBoundingClientRect();
        const main = document.querySelector('main');
        const region = main.querySelector('section');
        const mainRect = main.getBoundingClientRect();
        const regionRect = region.getBoundingClientRect();
        const motionStyles = [document.body, main, region].map((element) => {
          const style = getComputedStyle(element);
          return {
            animationDuration: style.animationDuration,
            transitionDuration: style.transitionDuration,
          };
        });

        return {
          title: document.title,
          hasHeader: Boolean(document.querySelector('header')),
          hasMainLandmark: main.getAttribute('id') === 'heroes',
          regionIsInsideMain: main.contains(region),
          body: { x: body.x, width: body.width },
          main: { x: mainRect.x, width: mainRect.width, height: mainRect.height },
          region: { x: regionRect.x, width: regionRect.width },
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: innerWidth,
          reducedMotionMatches: matchMedia('(prefers-reduced-motion: reduce)').matches,
          animationCount: document.getAnimations().length,
          motionStyles,
        };
      });
      const viewportResult = { ...viewport, initialState, pageErrors };
      actual.testedViewports.push(viewportResult);

      assert.equal(initialState.title, 'Our superheroes');
      assert.equal(initialState.hasHeader, true);
      assert.equal(initialState.hasMainLandmark, true);
      assert.equal(initialState.regionIsInsideMain, true);
      assert.deepEqual(initialState.body, {
        x: viewport.expectedBodyX,
        width: viewport.expectedBodyWidth,
      });
      assert.equal(initialState.main.width, viewport.expectedBodyWidth);
      assert.equal(initialState.region.width, viewport.expectedBodyWidth);
      assert.ok(initialState.main.height >= 32, 'the empty lesson region has a visible focus area');
      assert.ok(initialState.documentWidth <= initialState.viewportWidth, 'no horizontal page overflow');
      assert.equal(initialState.reducedMotionMatches, true);
      assert.equal(initialState.animationCount, 0);
      assert.ok(
        initialState.motionStyles.every(
          ({ animationDuration, transitionDuration }) =>
            animationDuration === '0s' && transitionDuration === '0s',
        ),
        'the page remains static under reduced motion',
      );

      await page.keyboard.press('Tab');
      const skipLink = page.locator('.skip-link');
      assert.equal(await skipLink.evaluate((element) => element === document.activeElement), true);
      const skipLinkFocus = await skipLink.evaluate((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          focusVisible: element.matches(':focus-visible'),
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          outlineColor: style.outlineColor,
          visibleInViewport:
            rect.width > 0 &&
            rect.height > 0 &&
            rect.top >= 0 &&
            rect.right <= innerWidth &&
            rect.bottom <= innerHeight,
        };
      });
      viewportResult.skipLinkFocus = skipLinkFocus;
      assert.equal(skipLinkFocus.focusVisible, true);
      assert.equal(skipLinkFocus.outlineStyle, 'solid');
      assert.equal(skipLinkFocus.outlineWidth, '3px');
      assert.equal(skipLinkFocus.outlineColor, 'rgb(0, 95, 204)');
      assert.equal(skipLinkFocus.visibleInViewport, true);

      await page.keyboard.press('Enter');
      const mainFocus = await page.locator('main').evaluate((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return {
          active: element === document.activeElement,
          focusVisible: element.matches(':focus-visible'),
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          outlineColor: style.outlineColor,
          visibleInViewport:
            rect.width > 0 &&
            rect.height > 0 &&
            rect.left >= 0 &&
            rect.right <= innerWidth &&
            rect.bottom <= innerHeight,
        };
      });
      viewportResult.mainFocus = mainFocus;
      assert.equal(mainFocus.active, true, 'the skip link moves focus to the heroes region');
      assert.equal(mainFocus.focusVisible, true);
      assert.equal(mainFocus.outlineStyle, 'solid');
      assert.equal(mainFocus.outlineWidth, '3px');
      assert.equal(mainFocus.outlineColor, 'rgb(0, 95, 204)');
      assert.equal(mainFocus.visibleInViewport, true);
      assert.deepEqual(pageErrors, [], 'the page must not raise unexpected errors');
    } finally {
      await context.close();
    }
  }
}

try {
  await main();
  console.log('PASS: reduced motion, keyboard focus, and static responsive layout at both widths.');
} catch (error) {
  failure = error;
  console.error(error);
} finally {
  if (browser) {
    await browser.close();
  }
  if (server?.listening) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(
    join(evidenceDirectory, 'actual.json'),
    `${JSON.stringify({ ...actual, outcome: failure ? 'failed' : 'passed' }, null, 2)}\n`,
  );
}

if (failure) {
  process.exitCode = 1;
}
