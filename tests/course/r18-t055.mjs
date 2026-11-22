import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);

const examplePath = '/javascript/apis/document-manipulation/dom-example.html';
const imagePath = '/javascript/apis/document-manipulation/dinosaur.png';
const evidenceDir = path.join(projectRoot, 'work/R18-T055');

const expectedAltText =
  'A red Tyrannosaurus Rex: A two legged dinosaur standing upright like a human, with small arms, and a large head with lots of sharp teeth.';
const expectedLinkHref = 'https://www.mozilla.org/';
const expectedLinkText = 'Mozilla homepage';
const expectedParagraphText = 'Here we will add a link to the Mozilla homepage';
const expectedTitle = 'Simple DOM example';
const expectedDimensions = { width: 240, height: 210 };
const lockedViewport = { width: 1280, height: 800 };

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;

  try {
    if (pathname === examplePath) {
      const html = await readFile(path.join(projectRoot, examplePath), 'utf8');
      response.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      });
      response.end(html);
      return;
    }

    if (pathname === imagePath) {
      const image = await readFile(path.join(projectRoot, imagePath));
      response.writeHead(200, {
        'Content-Type': 'image/png',
        'Cache-Control': 'no-store',
      });
      response.end(image);
      return;
    }

    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not Found');
  } catch (error) {
    response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end(`Server Error: ${error.message}`);
  }
});

let browser;

try {
  await mkdir(evidenceDir, { recursive: true });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;
  const targetUrl = `${baseUrl}${examplePath}`;

  browser = await chromium.launch({ headless: true });

  const snapshots = [];

  for (let index = 1; index <= 2; index++) {
    const pageErrors = [];
    const consoleErrors = [];
    const blockedRequests = [];

    const context = await browser.newContext({
      viewport: lockedViewport,
      locale: 'en-US',
      colorScheme: 'light',
    });

    const page = await context.newPage();

    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Enforce complete offline isolation: block any external/public network requests
    await page.route('**', route => {
      const requestUrl = route.request().url();
      if (!requestUrl.startsWith(baseUrl)) {
        blockedRequests.push(requestUrl);
        route.abort('blockedbyclient');
      } else {
        route.continue();
      }
    });

    const response = await page.goto(targetUrl, { waitUntil: 'networkidle' });
    assert.equal(response.status(), 200, `Expected HTTP 200 for ${examplePath}`);

    // Wait for the image element and ensure it is fully loaded
    const imageLocator = page.locator('img');
    await imageLocator.waitFor({ state: 'visible' });

    // Inspect DOM and layout state
    const domState = await page.evaluate(() => {
      const doc = document;
      const htmlLang = doc.documentElement.getAttribute('lang');
      const title = doc.title;
      const metaCharset = doc.querySelector('meta[charset]')?.getAttribute('charset') ?? null;
      const metaViewport = doc.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? null;

      const section = doc.querySelector('section');
      const sectionChildCount = section ? section.children.length : 0;

      const img = doc.querySelector('img');
      const imgSource = img ? img.getAttribute('src') : null;
      const imgAlt = img ? img.getAttribute('alt') : null;
      const imgNaturalWidth = img ? img.naturalWidth : 0;
      const imgNaturalHeight = img ? img.naturalHeight : 0;
      const imgComplete = img ? img.complete : false;
      const imgRect = img
        ? {
            width: Math.round(img.getBoundingClientRect().width),
            height: Math.round(img.getBoundingClientRect().height),
          }
        : null;

      const a = doc.querySelector('a');
      const aHref = a ? a.getAttribute('href') : null;
      const aText = a ? a.textContent.trim() : null;
      const aParentTag = a && a.parentElement ? a.parentElement.tagName.toLowerCase() : null;
      const aRect = a
        ? {
            width: Math.round(a.getBoundingClientRect().width),
            height: Math.round(a.getBoundingClientRect().height),
          }
        : null;

      const p = doc.querySelector('p');
      const pText = p ? p.textContent.replace(/\s+/g, ' ').trim() : null;

      const scriptCount = doc.querySelectorAll('script').length;
      const stylesheetCount = doc.querySelectorAll('link[rel="stylesheet"]').length;
      const styleTagCount = doc.querySelectorAll('style').length;

      return {
        htmlLang,
        title,
        metaCharset,
        metaViewport,
        sectionChildCount,
        image: {
          src: imgSource,
          alt: imgAlt,
          naturalWidth: imgNaturalWidth,
          naturalHeight: imgNaturalHeight,
          complete: imgComplete,
          rect: imgRect,
        },
        link: {
          href: aHref,
          text: aText,
          parentTag: aParentTag,
          rect: aRect,
        },
        paragraph: {
          text: pText,
        },
        scripts: scriptCount,
        stylesheets: stylesheetCount,
        styles: styleTagCount,
      };
    });

    // Assert DOM structure and anchored elements
    assert.equal(domState.title, expectedTitle, `Expected title "${expectedTitle}"`);
    assert.equal(domState.htmlLang, 'en-US', 'Expected lang "en-US"');
    assert.equal(domState.metaCharset, 'utf-8', 'Expected meta charset "utf-8"');
    assert.equal(
      domState.metaViewport,
      'width=device-width, initial-scale=1.0',
      'Expected meta viewport'
    );
    assert.equal(domState.sectionChildCount, 2, 'Section must contain exactly 2 children (img and p)');

    // Assert img anchor
    assert.equal(domState.image.src, 'dinosaur.png', 'img src must point to dinosaur.png');
    assert.equal(domState.image.alt, expectedAltText, 'img alt text must match expected descriptive text');
    assert.equal(
      domState.image.naturalWidth,
      expectedDimensions.width,
      `img natural width must be ${expectedDimensions.width}`
    );
    assert.equal(
      domState.image.naturalHeight,
      expectedDimensions.height,
      `img natural height must be ${expectedDimensions.height}`
    );
    assert.equal(domState.image.complete, true, 'img must be fully loaded');
    assert.deepEqual(
      domState.image.rect,
      expectedDimensions,
      'img rendered bounding dimensions must match 240x210'
    );

    // Assert a anchor
    assert.equal(domState.link.href, expectedLinkHref, 'link href must point to Mozilla homepage');
    assert.equal(domState.link.text, expectedLinkText, 'link text must be "Mozilla homepage"');
    assert.equal(domState.link.parentTag, 'p', 'link must be nested inside a <p>');
    assert.ok(domState.link.rect.width > 0, 'link bounding width must be greater than 0');
    assert.ok(domState.link.rect.height > 0, 'link bounding height must be greater than 0');

    // Assert paragraph text
    assert.equal(
      domState.paragraph.text,
      expectedParagraphText,
      `paragraph text must match "${expectedParagraphText}"`
    );

    // Assert page cleaniness (starter example has no scripts or extra styles)
    assert.equal(domState.scripts, 0, 'Starter page must contain zero scripts');
    assert.equal(domState.stylesheets, 0, 'Starter page must contain zero external stylesheets');
    assert.equal(domState.styles, 0, 'Starter page must contain zero style elements');

    // Assert error state
    assert.deepEqual(pageErrors, [], `Context ${index} must have zero page errors`);
    assert.deepEqual(consoleErrors, [], `Context ${index} must have zero console errors`);
    assert.deepEqual(blockedRequests, [], `Context ${index} must make zero external requests`);

    // Capture visual snapshot
    const screenshotPath = path.join(evidenceDir, `context${index}-1280x800.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    snapshots.push(domState);
    await context.close();
    console.log(`PASS: Context ${index} verified (img and a anchors, DOM structure, offline isolation).`);
  }

  // Cross-context determinism check
  assert.deepEqual(
    snapshots[0],
    snapshots[1],
    'Two fresh browser contexts must produce identical DOM and layout state'
  );
  console.log('PASS: Two fresh browser contexts produced identical asserted DOM and layout state.');

  // Mutation failure check: confirm that assertion fails if DOM/layout is mutated
  assert.throws(
    () => {
      const corruptedState = {
        ...snapshots[0],
        image: { ...snapshots[0].image, alt: 'Corrupted alt text' },
      };
      assert.deepEqual(corruptedState, snapshots[1]);
    },
    /AssertionError/,
    'Deliberate mutation must trigger an AssertionError'
  );
  console.log('PASS: Deliberate state mutation correctly triggers assertion rejection.');

  console.log('All automated checks in r18-t055.mjs passed successfully.');
} catch (error) {
  console.error('FAIL: r18-t055.mjs encountered an error:', error);
  process.exitCode = 1;
} finally {
  if (browser) {
    await browser.close();
  }
  await new Promise(resolve => server.close(resolve));
}
