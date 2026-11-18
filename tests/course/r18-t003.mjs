
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);

const examplePath =
  '/javascript/apis/document-manipulation/dom-example.html';

const imagePath =
  '/javascript/apis/document-manipulation/dinosaur.png';

const pageErrors = [];
let failImageRequest = true;

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://localhost').pathname;

  try {
    if (pathname === examplePath) {
      const html = await readFile(
        path.join(projectRoot, examplePath),
        'utf8'
      );
      response.writeHead(200, { 'Content-Type': 'text/html' });
      response.end(html);
      return;
    }

    if (pathname === imagePath) {
      if (failImageRequest) {
        response.writeHead(404, { 'Content-Type': 'text/plain' });
        response.end('Image not found');
        return;
      }

      const image = await readFile(
        path.join(projectRoot, imagePath)
      );
      response.writeHead(200, { 'Content-Type': 'image/png' });
      response.end(image);
      return;
    }

    response.writeHead(404);
    response.end('Not found');
  } catch (error) {
    response.writeHead(500);
    response.end('Server error');
    console.error(error);
  }
});

let browser;

try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  const pageUrl = `http://127.0.0.1:${address.port}${examplePath}`;

  browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('pageerror', error => pageErrors.push(error.message));

  // Test the failed image request.
  const failedResponse = page.waitForResponse(
    response => response.url().endsWith('/dinosaur.png')
  );

  await page.goto(pageUrl);
  const failedImage = await failedResponse;

  assert.equal(failedImage.status(), 404);

  const image = page.locator('img');
  await assert.doesNotReject(() => image.waitFor());

  assert.equal(
    await image.getAttribute('alt'),
    'A red Tyrannosaurus Rex: A two legged dinosaur standing upright like a human, with small arms, and a large head with lots of sharp teeth.'
  );

  assert.equal(
    await image.evaluate(element => element.naturalWidth),
    0,
    'The image should not load when the request fails.'
  );

  assert.ok(
    await image.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0;
    }),
    'The image element should remain in the page layout.'
  );

  console.log('PASS: Failed image request retains descriptive alternative text.');

  // Restore the image request and test successful loading.
  failImageRequest = false;

  const restoredResponse = page.waitForResponse(
    response => response.url().endsWith('/dinosaur.png')
  );

  await page.reload();
  const restoredImage = await restoredResponse;

  assert.equal(restoredImage.status(), 200);

  await page.locator('img').evaluate(element =>
    element.decode()
  );

  assert.ok(
    await page.locator('img').evaluate(element => element.naturalWidth > 0),
    'The dinosaur image should load after the request is restored.'
  );

  const link = page.locator('a');
  assert.equal(
    await link.getAttribute('href'),
    'https://www.mozilla.org/'
  );

  assert.deepEqual(
    pageErrors,
    [],
    'The page should not produce unexpected JavaScript errors.'
  );

  console.log('PASS: Image loads successfully after the request is restored.');
  console.log('PASS: Mozilla link has the expected destination.');
  console.log('PASS: No unexpected page errors.');

  await context.close();
} catch (error) {
  console.error('FAIL: R18-T003 automated test failed.');
  throw error;
} finally {
  if (browser) {
    await browser.close();
  }

  await new Promise(resolve => {
    server.close(resolve);
  });
}
