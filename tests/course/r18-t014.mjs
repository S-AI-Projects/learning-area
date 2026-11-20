import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runCourseCheck } from './support.mjs';

const taskId = 'R18-T014';
const pagePath = 'accessibility/assessment-finished/index.html';

await runCourseCheck({ taskId, pagePath, run: async (page) => {
  const toggle = page.locator('.show-hide');
  const wrapper = page.locator('.comment-wrapper');
  assert.equal(await toggle.textContent(), 'Show comments');
  assert.equal(await wrapper.evaluate((node) => getComputedStyle(node).display), 'none');
  const initialComments = await page.locator('.comment-container > li').count();

  await page.addScriptTag({ path: resolve('accessibility/assessment-finished/main.js') });
  await toggle.click();
  assert.equal(await toggle.textContent(), 'Hide comments');
  assert.equal(await wrapper.evaluate((node) => getComputedStyle(node).display), 'block');
  await toggle.click();
  assert.equal(await toggle.textContent(), 'Show comments');
  assert.equal(await wrapper.evaluate((node) => getComputedStyle(node).display), 'none');

  await toggle.click();
  await page.locator('#name').fill('Repeat check');
  await page.locator('#comment').fill('One submission after reinitialization.');
  await page.locator('.comment-form [type="submit"]').click();
  assert.equal(await page.locator('.comment-container > li').count(), initialComments + 1);
  const added = page.locator('.comment-container > li').last();
  assert.deepEqual(await added.locator('p').allTextContents(), [
    'Repeat check',
    'One submission after reinitialization.',
  ]);
  assert.equal(await page.locator('#name').inputValue(), '');
  assert.equal(await page.locator('#comment').inputValue(), '');

  const source = await readFile(resolve('accessibility/assessment-finished/main.js'), 'utf8');
  assert.doesNotMatch(source, /setTimeout|setInterval/);
  return {
    baseline: { commentCount: initialComments, wrapperDisplay: 'none', toggleText: 'Show comments' },
    afterReinitialization: { commentCount: initialComments + 1, insertedText: await added.innerText(), timersInSource: false },
  };
} });
