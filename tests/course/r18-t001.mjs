
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '../..'
  );
  
const pagePath = '/accessibility/assessment-start/assessment-files/';
const pageErrors = [];

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.jpg': 'image/jpeg',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
};

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(
    new URL(req.url, 'http://localhost').pathname
  );

  const filePath = path.resolve(root, `.${pathname}`);

  if (!filePath.startsWith(root + path.sep)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  let target = filePath;

  if (pathname.endsWith('/')) {
    target = path.join(target, 'index.html');
  }

  fs.readFile(target, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }

    res.writeHead(200, {
      'Content-Type': mimeTypes[path.extname(target)] || 'application/octet-stream',
    });
    res.end(content);
  });
});

let browser;

try {
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  const url = `http://127.0.0.1:${address.port}${pagePath}`;

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('pageerror', error => pageErrors.push(error.message));

  // Avoid relying on an external Google Fonts connection.
  await page.route('https://fonts.googleapis.com/**', route => route.abort());
  await page.route('https://fonts.gstatic.com/**', route => route.abort());

  await page.goto(url, { waitUntil: 'load' });

  const toggle = page.locator('.show-hide');
  const comments = page.locator('#comments');
  const name = page.locator('#name');
  const comment = page.locator('#comment');
  const submit = page.locator('.comment-form input[type="submit"]');

  // Initial state.
  assert.equal(await comments.isHidden(), true);
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
  console.log('PASS: Comments start hidden.');

  // Check that no element uses a positive tabindex.
  const positiveTabindex = await page.locator('[tabindex]').evaluateAll(elements =>
    elements
      .filter(element => Number(element.getAttribute('tabindex')) > 0)
      .map(element => element.outerHTML)
  );

  assert.deepEqual(positiveTabindex, []);
  console.log('PASS: No positive tabindex values.');

  // Use real Tab presses to reach the comments button.
  let reachedToggle = false;

  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');

    if (await toggle.evaluate(element => element === document.activeElement)) {
      reachedToggle = true;
      break;
    }
  }

  assert.equal(reachedToggle, true, 'Tab should reach Show comments.');

  const focusStyle = await toggle.evaluate(element => {
    const style = getComputedStyle(element);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      boxShadow: style.boxShadow,
    };
  });

  assert.ok(
    (focusStyle.outlineStyle !== 'none' &&
      focusStyle.outlineWidth !== '0px') ||
      focusStyle.boxShadow !== 'none',
    'The comments button should have a visible focus indicator.'
  );

  console.log('PASS: Tab reaches Show comments and focus is visible.');

  // Enter should open comments.
  await page.keyboard.press('Enter');

  assert.equal(await comments.isVisible(), true);
  assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
  console.log('PASS: Enter opens comments.');

  // Space should close comments.
  await page.keyboard.press('Space');

  assert.equal(await comments.isHidden(), true);
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
  console.log('PASS: Space closes comments.');

  // Open again and check the form's keyboard order.
  await page.keyboard.press('Enter');

  await page.keyboard.press('Tab');
  assert.equal(
    await name.evaluate(element => element === document.activeElement),
    true,
    'Tab should move to the name field.'
  );

  await page.keyboard.press('Tab');
  assert.equal(
    await comment.evaluate(element => element === document.activeElement),
    true,
    'Tab should move to the comment field.'
  );

  await page.keyboard.press('Tab');
  assert.equal(
    await submit.evaluate(element => element === document.activeElement),
    true,
    'Tab should move to the submit button.'
  );

  console.log('PASS: Tab reaches name, comment, and submit controls in order.');

  // Check label associations.
  assert.equal(
    await page.locator('label[for="name"]').evaluate(element => element.control.id),
    'name'
  );

  assert.equal(
    await page.locator('label[for="comment"]').evaluate(element => element.control.id),
    'comment'
  );

  console.log('PASS: Both form fields have associated labels.');

  // Submit a comment using the keyboard.
  await name.fill('Playwright Test');
  await comment.fill('Testing keyboard comment submission.');
  await comment.press('Enter');

  const addedComment = page.locator('.comment-container li').last();

  await assert.doesNotReject(async () => {
    await addedComment.waitFor({ state: 'visible' });
  });

  assert.equal(await addedComment.locator('p').nth(0).textContent(), 'Playwright Test');
  assert.equal(
    await addedComment.locator('p').nth(1).textContent(),
    'Testing keyboard comment submission.'
  );

  assert.equal(await name.inputValue(), '');
  assert.equal(await comment.inputValue(), '');

  console.log('PASS: Keyboard submission adds the comment and clears both fields.');

  assert.deepEqual(pageErrors, [], 'The page should not produce JavaScript errors.');
  console.log('PASS: No unexpected page errors.');

  await context.close();
  console.log('\nAll R18-T001 checks passed.');
} catch (error) {
  console.error('\nR18-T001 FAILED:', error);
  process.exitCode = 1;
} finally {
  if (browser) {
    await browser.close();
  }

  if (server.listening) {
    await new Promise(resolve => server.close(resolve));
  }
}
