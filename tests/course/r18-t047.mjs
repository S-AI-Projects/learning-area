import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from 'playwright';

const ROOT = process.cwd();
const PORT = 4177;
const URL = `http://127.0.0.1:${PORT}/javascript/asynchronous/workers/start/index.html`;

let server;
let browser;

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Local server exited with code ${server.exitCode}`);
    }

    try {
      const response = await fetch(URL);
      if (response.ok) return;
    } catch {
      // The server may need another moment to start.
    }

    await delay(250);
  }

  throw new Error('Local server did not become ready within 10 seconds.');
}

try {
  server = spawn('python3', [
    '-m', 'http.server', String(PORT),
    '--bind', '127.0.0.1',
    '--directory', ROOT
  ], { stdio: 'ignore' });

  await waitForServer();

  const launchOptions = { headless: true };
  if (process.env.CHROMIUM_PATH) {
    launchOptions.executablePath = process.env.CHROMIUM_PATH;
  }

  browser = await chromium.launch(launchOptions);
  const context = await browser.newContext();

  await context.addInitScript(() => {
    window.__r18T047HandlerExecuted = false;
  });

  const page = await context.newPage();
  const pageErrors = [];
  const failedRequests = [];
  const httpErrors = [];

  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('requestfailed', request => failedRequests.push(request.url()));
  page.on('response', response => {
    if (response.status() >= 400) {
      httpErrors.push(`${response.status()} ${response.url()}`);
    }
  });

  const response = await page.goto(URL, { waitUntil: 'load' });
  assert.equal(response.status(), 200, 'Starter page should return HTTP 200');

  assert.equal(await page.title(), 'Number of primes');
  await assert.doesNotReject(() => page.locator('#quota').waitFor());
  await assert.doesNotReject(() => page.locator('#generate').waitFor());
  await assert.doesNotReject(() => page.locator('#reload').waitFor());
  await assert.doesNotReject(() => page.locator('#user-input').waitFor());
  await assert.equal(await page.locator('#output').count(), 1, 'Output container should exist');

  assert.equal(
    await page.locator('label[for="quota"]').count(),
    1,
    'Quota input should have its associated label'
  );

  assert.equal(await page.locator('#quota').inputValue(), '1000000');
  assert.equal(
    await page.locator('#user-input').evaluate(element => getComputedStyle(element).display),
    'block',
    'Textarea should retain its block layout'
  );

  const payload = '<img src=x onerror="window.__r18T047HandlerExecuted=true">';
  await page.locator('#user-input').fill(payload);

  const observations = await page.evaluate(() => ({
    textareaValue: document.querySelector('#user-input').value,
    imageCount: document.querySelectorAll('img').length,
    outputText: document.querySelector('#output').textContent,
    handlerExecuted: window.__r18T047HandlerExecuted
  }));

  assert.equal(observations.textareaValue, payload, 'Input must remain exact text');
  assert.equal(observations.imageCount, 0, 'Input must not create an image element');
  assert.equal(observations.handlerExecuted, false, 'Injected handler must not execute');
  assert.equal(observations.outputText, '', 'Starter output should remain unchanged');

  await page.screenshot({
    path: 'work/R18-T047/after-input.png',
    fullPage: true
  });

  assert.deepEqual(pageErrors, [], 'Unexpected browser page errors');
  assert.deepEqual(failedRequests, [], 'Unexpected failed browser requests');
  assert.deepEqual(httpErrors, [], 'Unexpected HTTP error responses');

  console.log('R18-T047: PASS');
  console.log(`Page response: HTTP ${response.status()}`);
  console.log(`Browser: Chromium ${browser.version()}`);
  console.log('Verified: starter controls, label association, and textarea layout.');
  console.log('Verified: malicious-looking input remains exact textarea text.');
  console.log('Verified: no injected image element and no event-handler execution.');
  console.log('Verified: no page errors, failed requests, or HTTP error responses.');

  await context.close();
} catch (error) {
  console.error('R18-T047: FAIL');
  console.error(error);
  process.exitCode = 1;
} finally {
  if (browser) {
    await browser.close().catch(() => {});
  }

  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await Promise.race([
      new Promise(resolve => server.once('exit', resolve)),
      delay(3000)
    ]);

    if (server.exitCode === null) {
      server.kill('SIGKILL');
    }
  }
}
