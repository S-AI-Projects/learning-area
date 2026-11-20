import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { runCourseCheck } from './support.mjs';

const taskId = 'R18-T017';
const pagePath = 'html/forms/toggle-switch-example/index.html';

await runCourseCheck({ taskId, pagePath, run: async (page) => {
  await page.addStyleTag({ content: '* { transition-duration: 0s !important; animation-duration: 0s !important; }' });
  const power = page.locator('#power');
  const onText = page.locator('#power ~ label .on');
  const offText = page.locator('#power ~ label .off');
  const initial = await page.evaluate(() => {
    const input = document.querySelector('#power');
    const item = document.querySelector('li');
    return {
      checked: input.checked,
      trackColor: getComputedStyle(input).backgroundColor,
      layout: { itemWidth: item.getBoundingClientRect().width, inputWidth: input.getBoundingClientRect().width },
      onOpacity: getComputedStyle(document.querySelector('#power ~ label .on')).opacity,
      offOpacity: getComputedStyle(document.querySelector('#power ~ label .off')).opacity,
    };
  });
  assert.equal(initial.checked, false);
  assert.equal(initial.trackColor, 'rgb(238, 238, 238)');
  assert.equal(initial.onOpacity, '0');
  assert.equal(initial.offOpacity, '1');
  assert.deepEqual(initial.layout, { itemWidth: 100, inputWidth: 44 });
  assert.equal(await onText.innerText(), 'On');
  assert.equal(await offText.innerText(), 'Off');

  await power.check();
  const checkedByPointer = await page.evaluate(() => ({
    checked: document.querySelector('#power').checked,
    trackColor: getComputedStyle(document.querySelector('#power')).backgroundColor,
    onOpacity: getComputedStyle(document.querySelector('#power ~ label .on')).opacity,
    offOpacity: getComputedStyle(document.querySelector('#power ~ label .off')).opacity,
  }));
  assert.deepEqual(checkedByPointer, {
    checked: true, trackColor: 'rgb(255, 170, 0)', onOpacity: '1', offOpacity: '0',
  });

  await power.uncheck();
  await power.focus();
  assert.equal(await power.evaluate((input) => input.matches(':focus')), true);
  await power.press('Space');
  assert.equal(await power.isChecked(), true);
  assert.equal(await page.locator('#power ~ label .on').evaluate((item) => getComputedStyle(item).opacity), '1');
  await page.screenshot({ path: resolve('work/R18-T017/checked.png'), fullPage: true });

  return { initial, checkedByPointer, keyboardSpace: { checked: await power.isChecked(), visibleLabel: await onText.innerText() } };
} });
