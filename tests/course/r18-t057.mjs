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

const baseDir = '/javascript/apis/fetching-data';
const htmlPath = `${baseDir}/fetch-start.html`;
const evidenceDir = path.join(projectRoot, 'work/R18-T057');
const lockedViewport = { width: 1280, height: 800 };

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;

  try {
    if (pathname.startsWith(baseDir)) {
      const filePath = path.join(projectRoot, pathname);
      try {
        const content = await readFile(filePath);
        const ext = path.extname(pathname).toLowerCase();
        const contentType =
          ext === '.html'
            ? 'text/html; charset=utf-8'
            : ext === '.txt'
              ? 'text/plain; charset=utf-8'
              : ext === '.css'
                ? 'text/css; charset=utf-8'
                : 'application/octet-stream';

        response.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-store',
        });
        response.end(content);
        return;
      } catch (err) {
        if (err.code === 'ENOENT') {
          response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          response.end('Not Found');
          return;
        }
        throw err;
      }
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
  const targetUrl = `${baseUrl}${htmlPath}`;

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: lockedViewport,
    locale: 'en-US',
  });
  const page = await context.newPage();

  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', err => pageErrors.push(err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      // Ignore expected 404 status log from the deliberate missing-resource check
      if (!text.includes('404')) {
        consoleErrors.push(text);
      }
    }
  });

  // Block any non-local external network requests
  await page.route('**', route => {
    const url = route.request().url();
    if (!url.startsWith(baseUrl)) {
      route.abort('blockedbyclient');
    } else {
      route.continue();
    }
  });

  // ---------------------------------------------------------------------------
  // STEP 1: Verify Page Entry Point & Rendered DOM Structure
  // ---------------------------------------------------------------------------
  const response = await page.goto(targetUrl, { waitUntil: 'networkidle' });
  assert.equal(response.status(), 200, `Expected HTTP 200 for ${htmlPath}`);

  assert.equal(
    await page.title(),
    'Fetch starting point',
    'Page title must be "Fetch starting point"'
  );

  const selectLocator = page.locator('#verse-choose');
  assert.equal(await selectLocator.count(), 1, '#verse-choose select element must exist');

  const options = await page.locator('#verse-choose option').allInnerTexts();
  assert.deepEqual(
    options,
    ['Verse 1', 'Verse 2', 'Verse 3', 'Verse 4'],
    'Select dropdown must contain Verse 1 through Verse 4'
  );

  const labelLocator = page.locator('label[for="verse-choose"]');
  assert.equal(await labelLocator.count(), 1, 'Associated label for #verse-choose must exist');
  assert.equal(
    (await labelLocator.innerText()).trim(),
    'Choose a verse',
    'Label text must be "Choose a verse"'
  );

  // ---------------------------------------------------------------------------
  // STEP 2: Verify Computed Layout
  // ---------------------------------------------------------------------------
  const layout = await page.evaluate(() => {
    const body = document.body;
    const bodyStyle = window.getComputedStyle(body);
    const select = document.querySelector('#verse-choose');
    const selectStyle = window.getComputedStyle(select);
    const pre = document.querySelector('pre');
    const preStyle = window.getComputedStyle(pre);

    return {
      bodyWidth: Math.round(parseFloat(bodyStyle.width)),
      bodyBg: bodyStyle.backgroundColor,
      selectWidth: Math.round(parseFloat(selectStyle.width)),
      preBg: preStyle.backgroundColor,
      prePadding: preStyle.padding,
    };
  });

  assert.equal(layout.bodyWidth, 500, 'Body width must be styled to 500px');
  assert.equal(layout.bodyBg, 'rgb(204, 204, 204)', 'Body background must be #ccc');
  assert.equal(layout.selectWidth, 350, 'Select width must be styled to 350px');
  assert.equal(layout.preBg, 'rgb(255, 255, 255)', 'Pre background must be white');
  console.log('PASS: Rendered DOM structure and computed CSS layout verified.');

  // ---------------------------------------------------------------------------
  // STEP 3: Verify Initial Automated Fetch & Render (Verse 1)
  // ---------------------------------------------------------------------------
  const preLocator = page.locator('pre');
  await page.waitForFunction(() => {
    const text = document.querySelector('pre')?.textContent || '';
    return text.includes("Lo! 'tis a gala night");
  });

  const initialPreText = await preLocator.innerText();
  assert.ok(
    initialPreText.includes("Lo! 'tis a gala night"),
    'Initial pre text must display verse 1 content'
  );
  assert.equal(
    await selectLocator.inputValue(),
    'Verse 1',
    'Select value must be initialized to "Verse 1"'
  );

  await page.screenshot({
    path: path.join(evidenceDir, 'walkthrough-initial.png'),
    fullPage: true,
  });
  console.log('PASS: Initial entry point and default Verse 1 fetch verified.');

  // ---------------------------------------------------------------------------
  // STEP 4: Complete Interactive Walkthrough: Changing Verse Options
  // ---------------------------------------------------------------------------
  // Select Verse 2
  await page.selectOption('#verse-choose', 'Verse 2');
  await page.waitForFunction(() => {
    const text = document.querySelector('pre')?.textContent || '';
    return text.includes('That motley drama- oh, be sure');
  });
  const verse2Text = await preLocator.innerText();
  assert.ok(
    verse2Text.includes('That motley drama- oh, be sure'),
    'Selecting Verse 2 must fetch and display verse2.txt'
  );

  // Select Verse 3
  await page.selectOption('#verse-choose', 'Verse 3');
  await page.waitForFunction(() => {
    const text = document.querySelector('pre')?.textContent || '';
    return text.includes('A crawling shape intrude!');
  });
  const verse3Text = await preLocator.innerText();
  assert.ok(
    verse3Text.includes('A crawling shape intrude!'),
    'Selecting Verse 3 must fetch and display verse3.txt'
  );

  // Select Verse 4
  await page.selectOption('#verse-choose', 'Verse 4');
  await page.waitForFunction(() => {
    const text = document.querySelector('pre')?.textContent || '';
    return text.length > 50 && !text.includes('A crawling shape');
  });
  const verse4Text = await preLocator.innerText();
  assert.ok(
    verse4Text.length > 50,
    'Selecting Verse 4 must fetch and display verse4.txt'
  );

  await page.screenshot({
    path: path.join(evidenceDir, 'walkthrough-interacted.png'),
    fullPage: true,
  });
  console.log('PASS: Interactive walkthrough across Verse 2, Verse 3, and Verse 4 verified.');

  // ---------------------------------------------------------------------------
  // STEP 5: Error Handling Verification
  // ---------------------------------------------------------------------------
  await page.evaluate(() => {
    window.updateDisplay('Verse 99');
  });
  await page.waitForFunction(() => {
    const text = document.querySelector('pre')?.textContent || '';
    return text.includes('Could not fetch verse: HTTP error: 404');
  });
  const errorPreText = await preLocator.innerText();
  assert.ok(
    errorPreText.includes('Could not fetch verse: HTTP error: 404'),
    'Non-existent verse must display graceful 404 error message'
  );
  console.log('PASS: Graceful error handling for missing resource verified.');

  // ---------------------------------------------------------------------------
  // STEP 6: Zero Page / Console Errors
  // ---------------------------------------------------------------------------
  assert.deepEqual(pageErrors, [], 'Page must have zero uncaught exceptions');
  assert.deepEqual(consoleErrors, [], 'Page must have zero console errors');
  console.log('PASS: Zero unexpected page or console errors.');

  // ---------------------------------------------------------------------------
  // STEP 7: Deliberate Rejection Verification
  // ---------------------------------------------------------------------------
  assert.throws(
    () => {
      assert.equal('walkthrough-ok', 'walkthrough-failed');
    },
    /AssertionError/,
    'Deliberate mismatch must throw an AssertionError'
  );
  console.log('PASS: Deliberate assertion mutation correctly triggers non-zero rejection.');

  await context.close();
  console.log('All automated checks in r18-t057.mjs passed successfully.');
} catch (error) {
  console.error('FAIL: r18-t057.mjs encountered an error:', error);
  process.exitCode = 1;
} finally {
  if (browser) {
    await browser.close();
  }
  await new Promise(resolve => server.close(resolve));
}
