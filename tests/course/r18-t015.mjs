import assert from 'node:assert/strict';
import { runCourseCheck } from './support.mjs';

const taskId = 'R18-T015';
const pagePath = 'css/css-layout/legacy/html-skeleton-finished.html';
const viewports = [
  { width: 1280, height: 900 },
  { width: 390, height: 844 },
  { width: 1280, height: 900 },
];
const desktopLayouts = [];
const externalRequests = [];

await runCourseCheck({ taskId, pagePath, viewports, prepare: async (page) => {
  await page.route('https://**/*', async (route) => {
    externalRequests.push(route.request().url());
    await route.abort();
  });
  await page.route('**/skeleton.css', async (route) => {
    const response = await route.fetch();
    await route.fulfill({
      response,
      body: `${await response.text()}\nhtml, body { font-family: Arial, sans-serif !important; }`,
    });
  });
}, run: async (page, viewport) => {

  const layout = await page.evaluate(() => {
    const container = document.querySelector('.container').getBoundingClientRect();
    const rows = [...document.querySelectorAll('.row')].map((row) =>
      [...row.children].map((cell) => {
        const rect = cell.getBoundingClientRect();
        return { text: cell.textContent.trim(), x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width) };
      }),
    );
    return {
      container: { x: Math.round(container.x), width: Math.round(container.width) },
      rows,
      scrollWidth: document.documentElement.scrollWidth,
      headings: [...document.querySelectorAll('h1, h2, h3')].map((item) => item.textContent.trim()),
    };
  });
  assert.deepEqual(layout.rows[0].map((cell) => cell.text), ['1','2','3','4','5','6','7','8','9','10','11','12']);
  assert.deepEqual(layout.rows[1].map((cell) => cell.text), ['13','14','15','16']);
  assert.equal(layout.headings.length, 0);
  assert.equal(layout.container.width > 0, true);
  assert.equal(layout.scrollWidth >= viewport.width, true);
  assert.deepEqual(externalRequests, [], 'the static page must not depend on a public request');
  if (viewport.width >= 550) {
    assert.equal(new Set(layout.rows[0].map((cell) => cell.y)).size, 1, 'desktop grid row must stay aligned');
    assert.equal(layout.rows[0].every((cell, index, row) => index === 0 || cell.x > row[index - 1].x), true);
    desktopLayouts.push(layout);
    if (desktopLayouts.length === 2) assert.deepEqual(desktopLayouts[0], desktopLayouts[1]);
  } else {
    assert.equal(new Set(layout.rows[0].map((cell) => cell.x)).size, 1, 'mobile grid cells should stack');
    assert.equal(layout.rows[0].every((cell, index, row) => index === 0 || cell.y > row[index - 1].y), true);
  }

  return { ...layout, externalRequests };
} });
