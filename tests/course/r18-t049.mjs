import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const target = 'javascript/oojs/introduction/oojs.html';
const href = 'https://developer.mozilla.org/en-US/docs/Learn/Common_questions/What_are_browser_developer_tools';
const root = process.cwd();

async function server(directory) {
  const app = http.createServer(async (req, res) => {
    try {
      const file = path.resolve(directory, '.' + new URL(req.url, 'http://localhost').pathname);
      if (!file.startsWith(path.resolve(directory) + path.sep)) throw Error();
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(await fs.readFile(file));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise(resolve => app.listen(0, '127.0.0.1', resolve));
  return {
    url: `http://127.0.0.1:${app.address().port}/${target}`,
    close: () => new Promise(resolve => app.close(resolve)),
  };
}

async function check(page, url) {
  await page.goto(url);
  const p = page.locator('body > p');
  assert.equal(await p.count(), 1);
  assert.equal(await p.isVisible(), true);
  assert.match(await p.innerText(), /browser's JavaScript console/i);

  const anchor = page.locator('body > p > a');
  assert.equal(await anchor.count(), 1, 'Expected one documentation anchor');
  assert.equal(
    await anchor.getAttribute('href'),
    href,
    'Documentation link must retain its destination'
  );

  const link = page.getByRole('link', { name: 'What are browser developer tools' });
  assert.equal(await link.count(), 1);
  assert.equal(await link.isVisible(), true);

  const data = await link.evaluate(el => ({
    href: el.getAttribute('href'),
    display: getComputedStyle(el).display,
    visibility: getComputedStyle(el).visibility,
    pointerEvents: getComputedStyle(el).pointerEvents,
  }));

  assert.equal(data.href, href, 'Documentation link must retain its destination');
  assert.equal(data.display, 'inline');
  assert.equal(data.visibility, 'visible');
  assert.notEqual(data.pointerEvents, 'none');
  return data;
}

async function run(directory) {
  const web = await server(directory);
  let browser;
  let context;
  try {
    browser = await chromium.launch();
    context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    const result = await check(page, web.url);
    assert.deepEqual(errors, []);
    return result;
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
    await web.close();
  }
}

async function main() {
  const original = await fs.readFile(path.join(root, target), 'utf8');
  assert.ok(original.includes(`href="${href}"`));

  const baseline = await run(root);
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'r18-t049-'));

  try {
    const fixture = path.join(temp, target);
    await fs.mkdir(path.dirname(fixture), { recursive: true });
    await fs.writeFile(fixture, original.replace(`href="${href}"`, ''));

    let failure;
    try {
      await run(temp);
    } catch (error) {
      failure = error;
    }

    assert.ok(failure, 'Broken fixture unexpectedly passed');
    assert.match(failure.message, /Documentation link must retain its destination/);

    const version = JSON.parse(
      await fs.readFile('node_modules/playwright/package.json', 'utf8')
    ).version;

    await fs.mkdir('work/R18-T049', { recursive: true });
    await fs.writeFile('work/R18-T049/results.json', JSON.stringify({
      task: 'R18-T049',
      target,
      node: process.version,
      playwright: version,
      baseline: { passed: true, result: baseline },
      mutation: { correctlyDetected: true, failure: failure.message },
      originalLessonModified: false,
    }, null, 2) + '\n');

    await fs.writeFile('work/R18-T049/README.md',
      '# R18-T049 evidence\n\n' +
      '- Original lesson passes visible paragraph, link destination and computed-style checks.\n' +
      '- Temporary fixture removes the link href and is correctly rejected.\n' +
      '- Original lesson remains unchanged.\n' +
      '- Run: `node tests/course/r18-t049.mjs`\n');

    console.log('PASS: original lesson');
    console.log('PASS: broken-link mutation detected');
    console.log('Evidence saved in work/R18-T049/');
  } finally {
    await fs.rm(temp, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error('FAIL:', error);
  process.exitCode = 1;
});
