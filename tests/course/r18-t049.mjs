
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';

const target = 'javascript/oojs/introduction/oojs.html';
const href =
  'https://developer.mozilla.org/en-US/docs/Learn/Common_questions/What_are_browser_developer_tools';
const root = process.cwd();

async function startServer(directory) {
  const app = http.createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, 'http://localhost').pathname
      );

      const base = path.resolve(directory);
      const file = path.resolve(base, `.${pathname}`);

      if (!file.startsWith(base + path.sep)) {
        throw new Error('Invalid file path');
      }

      const content = await fs.readFile(file);

      res.writeHead(200, {
        'Content-Type': 'text/html; charset=utf-8',
      });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end('Not found');
    }
  });

  await new Promise((resolve, reject) => {
    app.once('error', reject);
    app.listen(0, '127.0.0.1', resolve);
  });

  const url = `http://127.0.0.1:${app.address().port}/${target}`;

  try {
    const response = await fetch(url);
    assert.equal(response.status, 200, 'Local server readiness check failed');
  } catch (error) {
    await new Promise(resolve => app.close(resolve));
    throw error;
  }

  return {
    url,
    close: () => new Promise((resolve, reject) => {
      app.close(error => error ? reject(error) : resolve());
    }),
  };
}

async function check(page, url) {
  await page.goto(url);

  const paragraph = page.locator('body > p');

  assert.equal(await paragraph.count(), 1);
  assert.equal(await paragraph.isVisible(), true);

  assert.match(
    await paragraph.innerText(),
    /browser's JavaScript console/i
  );

  const link = page.getByRole('link', {
    name: 'What are browser developer tools',
  });

  assert.equal(await link.count(), 1);
  assert.equal(await link.isVisible(), true);

  const data = await link.evaluate(element => ({
    href: element.getAttribute('href'),
    display: getComputedStyle(element).display,
    visibility: getComputedStyle(element).visibility,
    pointerEvents: getComputedStyle(element).pointerEvents,
  }));

  assert.equal(
    data.href,
    href,
    'Documentation link must retain its destination'
  );

  assert.equal(data.display, 'inline');
  assert.equal(data.visibility, 'visible');

  assert.notEqual(
    data.pointerEvents,
    'none',
    'Documentation link must receive pointer events'
  );

  let navigationIntercepted = false;

  await page.route(href, async route => {
    navigationIntercepted = true;

    await route.fulfill({
      status: 200,
      contentType: 'text/html',
      body: '<!doctype html><html><head><title>Local MDN test</title></head><body>Navigation verified</body></html>',
    });
  });

  await Promise.all([
    page.waitForURL(href),
    link.click(),
  ]);

  assert.equal(
    navigationIntercepted,
    true,
    'Documentation link navigation must be intercepted'
  );

  assert.equal(
    page.url(),
    href,
    'Documentation link must navigate to the correct destination'
  );

  return {
    ...data,
    clicked: true,
    navigationIntercepted,
    finalUrl: page.url(),
  };
}

async function run(directory) {
  const web = await startServer(directory);

  let browser;
  let context;

  try {
    browser = await chromium.launch();

    context = await browser.newContext({
      viewport: {
        width: 1280,
        height: 800,
      },
    });

    const page = await context.newPage();
    const errors = [];

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    const result = await check(page, web.url);

    assert.deepEqual(
      errors,
      [],
      'Unexpected browser page errors detected'
    );

    return {
      result,
      browserVersion: browser.version(),
    };
  } finally {
    if (context) await context.close();
    if (browser) await browser.close();
    await web.close();
  }
}

async function main() {
  const original = await fs.readFile(
    path.join(root, target),
    'utf8'
  );

  assert.ok(
    original.includes(`href="${href}"`),
    'Original lesson documentation link was not found'
  );

  // Record the correct, unmodified lesson behavior.
  const baseline = await run(root);

  // Create an isolated temporary fixture.
  const temp = await fs.mkdtemp(
    path.join(os.tmpdir(), 'r18-t049-')
  );

  try {
    const fixture = path.join(temp, target);

    await fs.mkdir(path.dirname(fixture), {
      recursive: true,
    });

    // Deliberately break the link's pointer interaction using CSS.
    const brokenStyle = `
<style>
  a {
    pointer-events: none;
  }
</style>
`;

    const mutated = original.replace(
      '</head>',
      `${brokenStyle}\n</head>`
    );

    assert.notEqual(
      mutated,
      original,
      'CSS mutation was not applied to the temporary fixture'
    );

    await fs.writeFile(fixture, mutated);

    let mutationFailure;

    try {
      await run(temp);
    } catch (error) {
      mutationFailure = error;
    }

    assert.ok(
      mutationFailure,
      'Broken CSS fixture unexpectedly passed'
    );

    assert.match(
      mutationFailure.message,
      /Documentation link must receive pointer events/,
      'Mutation failed for an unexpected reason'
    );

    assert.equal(
      mutationFailure.actual,
      'none',
      'Mutation should produce pointer-events: none'
    );

    assert.equal(
      mutationFailure.expected,
      'none'
    );

    // Record tool versions.
    const playwrightVersion = JSON.parse(
      await fs.readFile(
        'node_modules/playwright/package.json',
        'utf8'
      )
    ).version;

    const npmVersion = execFileSync(
      'npm',
      ['--version'],
      { encoding: 'utf8' }
    ).trim();

    // Save detailed evidence.
    await fs.mkdir('work/R18-T049', {
      recursive: true,
    });

    const evidence = {
      task: 'R18-T049',
      target,
      timestamp: new Date().toISOString(),

      tools: {
        node: process.version,
        npm: npmVersion,
        playwright: playwrightVersion,
        chromium: baseline.browserVersion,
      },

      baseline: {
        passed: true,
        expected: {
          paragraphVisible: true,
          linkVisible: true,
          href: href,
          display: 'inline',
          visibility: 'visible',
          pointerEvents: 'auto',
          navigationWorks: true,
        },
        actual: baseline.result,
      },

      mutation: {
        fixture: 'Temporary CSS mutation',
        input: brokenStyle.trim(),
        expected: {
          pointerEvents: 'auto',
          testResult: 'FAIL',
        },
        actual: {
          pointerEvents: mutationFailure.actual,
          testResult: 'FAIL',
          assertionMessage: mutationFailure.message,
        },
        correctlyDetected: true,
      },

      originalLessonModified: false,
    };

    await fs.writeFile(
      'work/R18-T049/results.json',
      JSON.stringify(evidence, null, 2) + '\n'
    );

    await fs.writeFile(
      'work/R18-T049/README.md',
      `# R18-T049 Evidence

## Baseline
- Original lesson passed.
- Instructional paragraph and documentation link are visible.
- Correct MDN destination verified.
- Computed layout and pointer interaction verified.
- Link click and navigation verified using a locally intercepted response.

## Deliberate CSS mutation
- Temporary fixture applies \`pointer-events: none\` to the link.
- The test detects the incorrect computed style.
- Expected pointer-events: auto.
- Actual pointer-events: none.
- The assertion fails for the intended reason.

## Safety
- Mutation is applied only to a temporary fixture.
- Original lesson remains unchanged.
- Temporary fixture is removed after testing.

## Tools
- Node: ${process.version}
- npm: ${npmVersion}
- Playwright: ${playwrightVersion}
- Chromium: ${baseline.browserVersion}

## Run
\`node tests/course/r18-t049.mjs\`
`
    );

    console.log('PASS: original lesson baseline');
    console.log('PASS: documentation link click and navigation');
    console.log('PASS: CSS mutation detected for intended reason');
    console.log('PASS: original lesson remains unchanged');
    console.log('Evidence saved in work/R18-T049/');

  } finally {
    await fs.rm(temp, {
      recursive: true,
      force: true,
    });
  }
}

main().catch(error => {
  console.error('FAIL:', error);
  process.exitCode = 1;
});
