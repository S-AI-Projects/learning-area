import assert from 'node:assert/strict';
import { runCourseCheck } from './support.mjs';

const taskId = 'R18-T016';
const pagePath = 'html/forms/your-first-HTML-form/first-form.html';

await runCourseCheck({ taskId, pagePath, prepare: async (page) => {
  await page.route(/first-form\.html\?feature=(baseline|unsupported)$/, async (route) => {
    const response = await route.fetch();
    let html = await response.text();
    assert.match(html, /type="email"/);
    if (new URL(route.request().url()).searchParams.get('feature') === 'baseline') {
      html = html
        .replace(/\s*<p id="mail-help"[\s\S]*?<\/p>\s*<p id="form-status"[\s\S]*?<\/p>/, '')
        .replace(/\s*<script src="form-fallback\.js" defer><\/script>/, '')
        .replace(' required />', ' />');
    } else {
      html = html.replace('type="email"', 'type="text"');
    }
    await route.fulfill({ response, body: html });
  });
}, run: async (page) => {
  const email = page.locator('#mail');
  const help = page.locator('#mail-help');
  const status = page.locator('#form-status');

  const baselineUrl = new URL(page.url());
  baselineUrl.searchParams.set('feature', 'baseline');
  await page.goto(baselineUrl.href, { waitUntil: 'load' });
  assert.equal(await email.evaluate((input) => input.type), 'email');
  await email.fill('not an email');
  const baselineInvalid = await email.evaluate((input) => input.checkValidity());
  assert.equal(baselineInvalid, false, 'the original native email field rejects malformed addresses');
  assert.equal(await page.locator('#mail-help').count(), 0, 'the original page has no unsupported-feature guidance');

  const supportedUrl = new URL(page.url());
  supportedUrl.searchParams.delete('feature');
  await page.goto(supportedUrl.href, { waitUntil: 'load' });

  assert.equal(await email.getAttribute('type'), 'email');
  assert.equal(await email.evaluate((input) => input.type), 'email');
  await email.fill('not an email');
  assert.equal(await email.evaluate((input) => input.checkValidity()), false);
  await email.fill('learner@example.com');
  assert.equal(await email.evaluate((input) => input.checkValidity()), true);
  assert.equal(await help.isVisible(), false);

  const unsupportedUrl = new URL(page.url());
  unsupportedUrl.searchParams.set('feature', 'unsupported');
  await page.goto(unsupportedUrl.href, { waitUntil: 'load' });
  assert.equal(await email.evaluate((input) => input.type), 'text');
  assert.equal(await help.isVisible(), true);
  assert.match(await help.innerText(), /does not validate email addresses automatically/i);

  await email.fill('not an email');
  const rejected = await page.locator('form').evaluate((form) => {
    const event = new Event('submit', { bubbles: true, cancelable: true });
    return { accepted: form.dispatchEvent(event), defaultPrevented: event.defaultPrevented };
  });
  assert.deepEqual(rejected, { accepted: false, defaultPrevented: true });
  assert.equal(await email.getAttribute('aria-invalid'), 'true');
  assert.equal(await status.textContent(), 'Enter an email address in the format name@example.com.');

  await email.fill('learner@example.com');
  const accepted = await page.locator('form').evaluate((form) => {
    const event = new Event('submit', { bubbles: true, cancelable: true });
    return { accepted: form.dispatchEvent(event), defaultPrevented: event.defaultPrevented };
  });
  assert.deepEqual(accepted, { accepted: true, defaultPrevented: false });
  assert.equal(await email.getAttribute('aria-invalid'), null);
  assert.equal(await status.textContent(), '');

  return {
    baselineBeforeChange: { inputType: 'email', malformedAddressValid: baselineInvalid, unsupportedGuidance: false },
    nativeEmail: { type: 'email', invalidRejected: true, validAcceptedByConstraintApi: true },
    unsupportedFallback: { type: 'text', helpVisible: true, invalidSubmitPrevented: true, validSubmitAllowed: true },
  };
} });
