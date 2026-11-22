/**
 * R18-T037 — html/forms/sending-form-data/get-method.html
 * Source anchor: #say
 *
 * Goal: Document page entry point, setup command, layout assertions,
 * and complete interaction observations (label focus transfer, input editing,
 * and HTTP GET query string serialization upon submission).
 *
 * Run: node tests/course/r18-t037.mjs
 * Exit 0 = all assertions pass; non-zero = assertion failure.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';
import assert from 'assert/strict';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT      = path.resolve(__dirname, '../../');
const WORK_DIR  = path.join(ROOT, 'work/R18-T037');
fs.mkdirSync(WORK_DIR, { recursive: true });

const PAGE_PATH = '/html/forms/sending-form-data/get-method.html';

// ── Local static-file server ─────────────────────────────────────────────────
function createServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(ROOT, req.url.split('?')[0]);
      if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
      if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
        filePath = path.join(filePath, 'index.html');
      }
      if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('Not found'); return; }
      const ext  = path.extname(filePath).toLowerCase();
      const mime = {
        '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript',
        '.webm': 'video/webm', '.mp4': 'video/mp4', '.png': 'image/png',
      }[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': mime });
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

// ── Helper: Attach offline mock for form target http://example.com ────────────
async function attachRouteMock(page) {
  let interceptedRequest = null;
  await page.route('http://example.com/**', async (route) => {
    interceptedRequest = route.request();
    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: `<!doctype html>
<html>
  <head><title>Form Submitted</title></head>
  <body>
    <h1>Example Domain - Submission Echo</h1>
    <p id="submitted-url">${route.request().url()}</p>
    <p id="submitted-method">${route.request().method()}</p>
  </body>
</html>`,
    });
  });
  return () => interceptedRequest;
}

// ── PASS 1: Layout & DOM Structure Assertions ─────────────────────────────────
async function testLayoutAndDOM(page, baseUrl) {
  console.log('\n── Pass 1: Rendered DOM & Computed Layout ────────────────────────');
  await page.goto(`${baseUrl}${PAGE_PATH}`, { waitUntil: 'domcontentloaded' });

  // 1. Form element assertions
  const form = page.locator('form');
  assert.equal(await form.count(), 1, 'Exactly one <form> element must exist');
  const formAction = await form.getAttribute('action');
  const formMethod = await form.getAttribute('method');
  assert.equal(formAction, 'http://example.com', 'Form action must be http://example.com');
  assert.equal(formMethod?.toLowerCase(), 'get', 'Form method must be get');

  // 2. Source anchor #say assertions
  const sayInput = page.locator('#say');
  assert.equal(await sayInput.count(), 1, 'Source anchor #say input must exist in DOM');
  const sayTagName = await sayInput.evaluate((el) => el.tagName);
  assert.equal(sayTagName, 'INPUT', '#say must be an <input> element');
  const sayName = await sayInput.getAttribute('name');
  assert.equal(sayName, 'say', '#say input must have name="say"');
  const sayInitialValue = await sayInput.inputValue();
  assert.equal(sayInitialValue, 'Hi', '#say initial value must be "Hi"');

  // 3. Label for #say assertions
  const sayLabel = page.locator('label[for="say"]');
  assert.equal(await sayLabel.count(), 1, '<label for="say"> must exist');
  const sayLabelText = (await sayLabel.innerText()).trim();
  assert.equal(sayLabelText, 'What greeting do you want to say?', 'Label text must match teaching demo');

  // 4. Second control assertions
  const toInput = page.locator('input[name="to"]');
  assert.equal(await toInput.count(), 1, 'Input with name="to" must exist');
  const toInitialValue = await toInput.inputValue();
  assert.equal(toInitialValue, 'Mom', 'input[name="to"] initial value must be "Mom"');

  const toLabel = page.locator('label[for="to"]');
  assert.equal(await toLabel.count(), 1, '<label for="to"> must exist');
  const toLabelText = (await toLabel.innerText()).trim();
  assert.equal(toLabelText, 'Who do you want to say it to?', 'Label for "to" text must match teaching demo');

  // 5. Submit button assertions
  const submitBtn = page.locator('button');
  assert.equal(await submitBtn.count(), 1, 'Submit button must exist');
  const btnText = (await submitBtn.innerText()).trim();
  assert.equal(btnText, 'Send my greetings', 'Submit button text must be "Send my greetings"');

  // 6. Computed CSS Layout assertions
  const formStyles = await form.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    return { width: cs.width, display: cs.display };
  });
  assert.equal(formStyles.width, '420px', 'Form computed width must be 420px');

  const labelStyles = await sayLabel.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    return {
      display: cs.display,
      width: cs.width,
      textAlign: cs.textAlign,
      paddingRight: cs.paddingRight,
    };
  });
  assert.equal(labelStyles.display, 'inline-block', 'Label display must be inline-block');
  assert.equal(labelStyles.width, '240px', 'Label width must be 240px');
  assert.equal(labelStyles.textAlign, 'right', 'Label text-align must be right');
  assert.equal(labelStyles.paddingRight, '10px', 'Label padding-right must be 10px');

  const inputStyles = await sayInput.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    return { cssFloat: cs.cssFloat };
  });
  assert.equal(inputStyles.cssFloat, 'right', 'Input #say must have float: right');

  const btnStyles = await submitBtn.evaluate((el) => {
    const cs = window.getComputedStyle(el);
    return { cssFloat: cs.cssFloat };
  });
  assert.equal(btnStyles.cssFloat, 'right', 'Submit button must have float: right');

  // 7. No horizontal overflow
  const noOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth <= document.documentElement.clientWidth;
  });
  assert.ok(noOverflow, 'Page must not produce horizontal overflow at 1280px viewport');

  await page.screenshot({ path: path.join(WORK_DIR, 'baseline-form.png'), fullPage: true });
  console.log('  ✅ DOM structure and computed layout assertions passed');

  return {
    formAction,
    formMethod,
    formWidth: formStyles.width,
    sayTagName,
    sayName,
    sayInitialValue,
    sayLabelText,
    toInitialValue,
    btnText,
    labelStyles,
    inputStyles,
  };
}

// ── PASS 2: Label Click Focus Transfer Observation ───────────────────────────
async function testLabelFocusTransfer(page) {
  console.log('\n── Pass 2: Label Focus Transfer Interaction ───────────────────');
  // Click on the label text
  await page.click('label[for="say"]');

  // Assert that document.activeElement is #say
  const activeElementId = await page.evaluate(() => document.activeElement?.id);
  assert.equal(activeElementId, 'say', 'Clicking label[for="say"] must transfer keyboard focus to #say');
  console.log('  ✅ Label focus transfer to #say verified');
  return { activeElementId };
}

// ── PASS 3: Baseline Form Submission (Default Values) ─────────────────────────
async function testBaselineSubmission(browser, baseUrl) {
  console.log('\n── Pass 3: Baseline Form Submission (Default Values) ───────────');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  const getIntercepted = await attachRouteMock(page);

  await page.goto(`${baseUrl}${PAGE_PATH}`, { waitUntil: 'domcontentloaded' });

  // Click submit button
  await Promise.all([
    page.waitForURL((url) => url.hostname === 'example.com'),
    page.click('button'),
  ]);

  const interceptedReq = getIntercepted();
  assert.ok(interceptedReq, 'A form submission request must be dispatched');
  assert.equal(interceptedReq.method(), 'GET', 'Submission HTTP method must be GET');

  const parsedUrl = new URL(interceptedReq.url());
  assert.equal(parsedUrl.origin, 'http://example.com', 'Request origin must be http://example.com');
  assert.equal(parsedUrl.pathname, '/', 'Request path must be /');
  assert.equal(parsedUrl.searchParams.get('say'), 'Hi', 'Query parameter "say" must match default "Hi"');
  assert.equal(parsedUrl.searchParams.get('to'), 'Mom', 'Query parameter "to" must match default "Mom"');

  console.log(`  ✅ Baseline submission intercepted: ${interceptedReq.url()}`);
  await ctx.close();

  return {
    submittedUrl: interceptedReq.url(),
    method: interceptedReq.method(),
    paramSay: parsedUrl.searchParams.get('say'),
    paramTo: parsedUrl.searchParams.get('to'),
  };
}

// ── PASS 4: Interactive Modification & Submission Walkthrough ────────────────
async function testInteractiveModification(browser, baseUrl) {
  console.log('\n── Pass 4: Interactive Modification & Submission Walkthrough ──');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pageErrors = [];
  const page = await ctx.newPage();
  page.on('pageerror', (err) => pageErrors.push(err.message));
  const getIntercepted = await attachRouteMock(page);

  await page.goto(`${baseUrl}${PAGE_PATH}`, { waitUntil: 'domcontentloaded' });

  // 1. Focus #say via label click
  await page.click('label[for="say"]');

  // 2. Clear and type custom greeting in #say
  const newGreeting = 'Hello, World!';
  await page.fill('#say', newGreeting);
  const updatedSayValue = await page.inputValue('#say');
  assert.equal(updatedSayValue, newGreeting, '#say value must reflect typed text');

  // 3. Clear and type recipient in input[name="to"]
  const newRecipient = 'Alice';
  await page.fill('input[name="to"]', newRecipient);
  const updatedToValue = await page.inputValue('input[name="to"]');
  assert.equal(updatedToValue, newRecipient, 'input[name="to"] value must reflect typed text');

  // Capture modified state screenshot
  await page.screenshot({ path: path.join(WORK_DIR, 'interactive-modified.png'), fullPage: true });

  // 4. Submit form
  await Promise.all([
    page.waitForURL((url) => url.hostname === 'example.com'),
    page.click('button'),
  ]);

  const interceptedReq = getIntercepted();
  assert.ok(interceptedReq, 'Interactive submission request must be dispatched');
  assert.equal(interceptedReq.method(), 'GET', 'Submission method must be GET');

  const parsedUrl = new URL(interceptedReq.url());
  assert.equal(parsedUrl.searchParams.get('say'), newGreeting, 'Query param "say" must reflect updated greeting');
  assert.equal(parsedUrl.searchParams.get('to'), newRecipient, 'Query param "to" must reflect updated recipient');

  // 5. Echo element verified on submitted page
  const echoUrl = await page.locator('#submitted-url').innerText();
  assert.equal(echoUrl, interceptedReq.url(), 'Submitted page echo must display full GET query URL');

  // Capture submitted page screenshot
  await page.screenshot({ path: path.join(WORK_DIR, 'submitted-state.png'), fullPage: true });

  // 6. Assert zero unexpected page errors
  assert.deepEqual(pageErrors, [], 'No unexpected page errors occurred during interaction');

  console.log(`  ✅ Interactive submission verified: ${interceptedReq.url()}`);
  await ctx.close();

  return {
    updatedSayValue,
    updatedToValue,
    submittedUrl: interceptedReq.url(),
    method: interceptedReq.method(),
    paramSay: parsedUrl.searchParams.get('say'),
    paramTo: parsedUrl.searchParams.get('to'),
  };
}

// ── Main Execution ────────────────────────────────────────────────────────────
let server = null;
let browser = null;

try {
  server = await createServer();
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;
  console.log(`Local server: ${baseUrl}`);

  browser = await chromium.launch({ headless: true });

  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  const layoutEvidence = await testLayoutAndDOM(page, baseUrl);
  const focusEvidence = await testLabelFocusTransfer(page);
  await ctx.close();

  const baselineSubEvidence = await testBaselineSubmission(browser, baseUrl);
  const interactiveEvidence = await testInteractiveModification(browser, baseUrl);

  console.log('\n✅ All assertions passed — R18-T037 PASS');

  // Save evidence.json
  const evidence = {
    task: 'R18-T037',
    page: 'html/forms/sending-form-data/get-method.html',
    sourceAnchor: '#say',
    layout: layoutEvidence,
    focusTransfer: focusEvidence,
    baselineSubmission: baselineSubEvidence,
    interactiveSubmission: interactiveEvidence,
    result: 'PASS',
    timestamp: new Date().toISOString(),
  };

  fs.writeFileSync(
    path.join(WORK_DIR, 'evidence.json'),
    JSON.stringify(evidence, null, 2)
  );
} catch (err) {
  console.error('\n❌ ASSERTION FAILURE:', err.message);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server) {
    server.closeAllConnections?.();
    await new Promise((r) => server.close(r));
  }
}
