import assert from 'node:assert/strict';
import { runCourseCheck } from './support.mjs';

const taskId = 'R18-T019';
const pagePath = 'tools-testing/cross-browser-testing/javascript/bad-for-loop.html';
const viewports = [
  { width: 390, height: 844 },
  { width: 1280, height: 900 },
];

await runCourseCheck({ taskId, pagePath, viewports, contextOptions: { reducedMotion: 'reduce' }, run: async (page, viewport) => {
  assert.equal(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), true);
  const items = page.locator('.demo-paragraph');
  assert.equal(await items.count(), 10);
  assert.equal(await items.first().innerText(), 'This is paragraph 1.');
  assert.equal(await items.last().innerText(), 'This is paragraph 10.');
  assert.equal(await items.evaluateAll((buttons) => buttons.every((button) => {
    const style = getComputedStyle(button);
    const rect = button.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && style.animationDuration === '0s' && style.transitionDuration === '0s';
  })), true);

  await page.keyboard.press('Tab');
  assert.equal(await items.first().evaluate((button) => button.matches(':focus-visible')), true);
  const focus = await items.first().evaluate((button) => {
    const style = getComputedStyle(button);
    const rect = button.getBoundingClientRect();
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      insideViewport: rect.left >= 0 && rect.right <= window.innerWidth,
    };
  });
  assert.equal(focus.outlineStyle, 'solid');
  assert.equal(focus.outlineWidth, '3px');
  assert.equal(focus.outlineColor, 'rgb(0, 95, 204)');
  assert.equal(focus.insideViewport, true);

  const dialogs = [];
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.accept();
  });
  await items.first().press('Enter');
  assert.deepEqual(dialogs, ['Hello from paragraph 11!']);
  return {
    viewport,
    reducedMotion: true,
    visibleItems: await items.count(),
    focus,
    keyboardActivation: dialogs[0],
  };
} });
