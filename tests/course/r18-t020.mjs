import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runCourseCheck } from './support.mjs';

const taskId = 'R18-T020';
const pagePath = 'javascript/oojs/tasks/json/json1.html';
const dataUrl = 'https://mdn.github.io/learning-area/javascript/oojs/tasks/json/sample.json';
const fixturePath = 'tests/course/fixtures/R18-T020/sample.json';
const fixture = await readFile(resolve(fixturePath), 'utf8');
let fixtureRequests = 0;
const unexpectedExternalRequests = [];

await runCourseCheck({ taskId, pagePath, prepare: async (page) => {
  await page.addInitScript(() => {
    const addEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (type, ...args) {
      if (this.id === 'reset') window.__resetListenerType = type;
      return addEventListener.call(this, type, ...args);
    };
  });
  await page.route('https://**/*', async (route) => {
    if (route.request().url() === dataUrl) {
      fixtureRequests += 1;
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
        body: fixture,
      });
      return;
    }
    unexpectedExternalRequests.push(route.request().url());
    await route.abort();
  });
}, run: async (page) => {
  await page.waitForLoadState('networkidle');
  await page.waitForFunction(() => document.querySelector('.preview').textContent.includes('The mother cats are called'));
  const editor = page.locator('.playable-js');
  const preview = page.locator('.preview');
  const originalCode = await editor.inputValue();
  const baseline = {
    resetLabel: await page.locator('#reset').getAttribute('value'),
    editorMatchesDefault: true,
    previewParagraphs: await preview.locator('p').count(),
    previewText: await preview.innerText(),
  };
  assert.equal(baseline.resetLabel, 'Reset');
  assert.equal(await page.evaluate(() => window.__resetListenerType), 'click');
  assert.equal(baseline.previewParagraphs, 2);
  assert.match(baseline.previewText, /The mother cats are called/);

  const editedCode = "document.querySelector('.preview').textContent = 'Edited fixture output';";
  await editor.fill(editedCode);
  assert.equal(await preview.innerText(), 'Edited fixture output');
  await page.locator('#reset').click();
  await page.waitForFunction(() => document.querySelector('.preview').textContent.includes('The mother cats are called'));
  const restoredCode = await editor.inputValue();
  const restoredPreview = await preview.innerText();
  assert.equal(restoredCode, originalCode);
  assert.equal(restoredPreview, baseline.previewText);

  let mutationApplied = false;
  await page.context().route('**/playable.js', async (route) => {
    const response = await route.fetch();
    const originalScript = await response.text();
    const brokenScript = originalScript.replace(
      "reset.addEventListener('click', function () {",
      "reset.addEventListener('mouseover', function () {",
    );
    assert.notEqual(brokenScript, originalScript, 'the mutation fixture must change the reset event binding');
    mutationApplied = true;
    await route.fulfill({ response, body: brokenScript });
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => document.querySelector('.preview').textContent.includes('The mother cats are called'));
  assert.equal(await page.evaluate(() => window.__resetListenerType), 'mouseover');
  await editor.fill(editedCode);
  assert.equal(await preview.innerText(), 'Edited fixture output');
  await page.locator('#reset').evaluate((button) => button.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
  const mutatedEditorValue = await editor.inputValue();
  const mutationCaught = mutatedEditorValue !== originalCode;
  assert.equal(mutationApplied, true);
  assert.equal(mutationCaught, true, 'the reset assertion must fail when its click binding is deliberately broken');
  assert.equal(await preview.innerText(), 'Edited fixture output');
  assert.deepEqual(unexpectedExternalRequests, []);
  assert.equal(fixtureRequests >= 3, true);

  return {
    baseline,
    correctPage: { editorRestored: restoredCode === originalCode, previewRestored: restoredPreview === baseline.previewText },
    mutation: {
      brokenBinding: 'click changed to mouseover in a route-only temporary response fixture',
      expected: 'Reset click restores the original editor contents',
      actual: 'Edited code remains after clicking Reset',
      assertionDetectedDifference: mutationCaught,
    },
    fixture: { url: dataUrl, requests: fixtureRequests, unexpectedExternalRequests },
  };
} });
