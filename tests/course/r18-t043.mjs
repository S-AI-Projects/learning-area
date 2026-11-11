import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../..'
);

const expectedError = /Identifier 'name' has already been declared/;
const expectedGreeting = 'Hello Chris: welcome to our company.';

async function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(
        new URL(request.url, 'http://localhost').pathname
      );
      const requestedPath = path.resolve(projectRoot, `.${pathname}`);

      if (
        requestedPath !== projectRoot &&
        !requestedPath.startsWith(projectRoot + path.sep)
      ) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }

      const content = await readFile(requestedPath);
      const extension = path.extname(requestedPath);
      const contentTypes = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.png': 'image/png'
      };

      response.writeHead(200, {
        'Content-Type': contentTypes[extension] || 'application/octet-stream'
      });
      response.end(content);
    } catch {
      response.writeHead(404);
      response.end('Not found');
    }
  });

  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });

  const address = server.address();
  const url = `http://127.0.0.1:${address.port}`;

  // Confirm that the local server is responding before launching the browser.
  try {
    const readiness = await fetch(
      `${url}/javascript/building-blocks/functions/conflict.html`
    );
    assert.equal(readiness.status, 200, 'Local server should serve conflict.html');
    return { server, url };
  } catch (error) {
    await new Promise((resolve) => server.close(resolve));
    throw error;
  }
}

test('R18-T043: repeat loading and isolated DOM lifecycle toggles remain singular', async () => {
  let browser;
  let server;

  try {
    const runningServer = await startServer();
    server = runningServer.server;

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    let dialogs = [];
    const consoleErrors = [];
    const pageErrors = [];

    page.on('dialog', async (dialog) => {
      dialogs.push({ type: dialog.type(), message: dialog.message() });
      await dialog.accept();
    });

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push({
          text: message.text(),
          location: message.location().url
        });
      }
    });

    page.on('pageerror', (error) => {
      pageErrors.push(error.message);
    });

    const pageUrl =
      `${runningServer.url}/javascript/building-blocks/functions/conflict.html`;

    // Baseline: the real example is loaded twice without changing its source.
    for (let load = 1; load <= 2; load++) {
      dialogs = [];
      const errorsBeforeLoad = pageErrors.length;

      await page.goto(pageUrl, { waitUntil: 'load' });

      assert.equal(
        await page.locator('body').innerText(),
        'My body',
        `Page content should remain correct on load ${load}`
      );
      assert.equal(
        await page.evaluate(() => typeof greeting),
        'function',
        `The first greeting function should remain available on load ${load}`
      );
      assert.equal(dialogs.length, 1, `Exactly one greeting alert should appear on load ${load}`);
      assert.equal(dialogs[0].type, 'alert');
      assert.equal(dialogs[0].message, expectedGreeting);
      assert.equal(
        pageErrors.length,
        errorsBeforeLoad + 1,
        `Exactly one expected page error should occur on load ${load}`
      );
      assert.match(pageErrors.at(-1), expectedError);
      console.log(`Baseline load ${load}: passed`);
    }

    // The original page has no controls, timers, or listeners. Re-execute its
    // first classic script in the same document and verify its known conflict.
    const errorsBeforeRepeat = pageErrors.length;
    const scriptsBeforeRepeat = await page.locator('script').count();

    const repeatedScriptResult = await page.evaluate(async () => {
      const script = document.createElement('script');
      script.src = './first.js';
      const outcome = await new Promise((resolve) => {
        script.onload = () => resolve('load');
        script.onerror = () => resolve('error');
        document.body.append(script);
      });
      script.remove();
      return {
        outcome,
        greetingType: typeof greeting,
        scriptCount: document.scripts.length,
        bodyText: document.body.innerText
      };
    });

    assert.equal(repeatedScriptResult.outcome, 'load');
    assert.equal(repeatedScriptResult.greetingType, 'function');
    assert.equal(repeatedScriptResult.scriptCount, scriptsBeforeRepeat);
    assert.equal(repeatedScriptResult.bodyText, 'My body');
    assert.equal(pageErrors.length, errorsBeforeRepeat + 1);
    assert.match(pageErrors.at(-1), expectedError);
    console.log('Same-document script repeat: passed');

    // Isolated harness: the static example has no demo toggle, so add a
    // test-owned toggle to its main rendered paragraph. Initialize twice,
    // then prove there is one listener, timer, button, and generated panel.
    const lifecycle = await page.evaluate(async () => {
      const target = document.querySelector('body > p');
      if (!target) throw new Error('Expected main rendered paragraph was not found');

      const state = {
        initializationCount: 0,
        activeListeners: 0,
        activeTimers: 0,
        clickEffects: 0,
        timerTicks: 0,
        toggleCount: 0
      };
      let currentCleanup;

      function initializeToggleHarness() {
        state.initializationCount += 1;
        currentCleanup?.();

        const button = document.createElement('button');
        button.id = 'r18-t043-toggle';
        button.type = 'button';
        button.textContent = 'Toggle highlight';

        const panel = document.createElement('div');
        panel.id = 'r18-t043-generated-panel';
        panel.textContent = 'Lifecycle demo initialized';
        panel.style.display = 'block';
        panel.style.padding = '8px';
        panel.style.marginTop = '8px';
        panel.style.border = '1px solid currentColor';

        target.insertAdjacentElement('afterend', button);
        button.insertAdjacentElement('afterend', panel);

        const originalInlineBackground = target.style.backgroundColor;
        const onClick = () => {
          const highlighted = target.classList.toggle('r18-t043-highlighted');
          target.style.backgroundColor = highlighted
            ? 'rgb(255, 255, 0)'
            : originalInlineBackground;
          state.clickEffects += 1;
          state.toggleCount += 1;
        };
        button.addEventListener('click', onClick);
        state.activeListeners += 1;

        const intervalId = window.setInterval(() => {
          state.timerTicks += 1;
          panel.dataset.ticks = String(state.timerTicks);
        }, 20);
        state.activeTimers += 1;

        let cleaned = false;
        const cleanup = () => {
          if (cleaned) return;
          cleaned = true;
          button.removeEventListener('click', onClick);
          state.activeListeners -= 1;
          window.clearInterval(intervalId);
          state.activeTimers -= 1;
          button.remove();
          panel.remove();
          target.classList.remove('r18-t043-highlighted');
          target.style.backgroundColor = originalInlineBackground;
          if (currentCleanup === cleanup) currentCleanup = undefined;
        };

        currentCleanup = cleanup;
        return { button, panel, cleanup };
      }

      try {
        initializeToggleHarness();
        const activeHarness = initializeToggleHarness();

        const beforeInteraction = {
          buttons: document.querySelectorAll('#r18-t043-toggle').length,
          panels: document.querySelectorAll('#r18-t043-generated-panel').length,
          activeListeners: state.activeListeners,
          activeTimers: state.activeTimers,
          panelDisplay: getComputedStyle(activeHarness.panel).display,
          targetWidth: target.getBoundingClientRect().width,
          targetHeight: target.getBoundingClientRect().height,
          targetBackground: getComputedStyle(target).backgroundColor
        };

        // Two user interactions must produce exactly two effects, not four.
        activeHarness.button.click();
        const backgroundAfterFirstClick = getComputedStyle(target).backgroundColor;
        activeHarness.button.click();
        const backgroundAfterSecondClick = getComputedStyle(target).backgroundColor;
        await new Promise((resolve) => window.setTimeout(resolve, 90));

        const beforeCleanup = {
          clickEffects: state.clickEffects,
          toggleCount: state.toggleCount,
          highlighted: target.classList.contains('r18-t043-highlighted'),
          backgroundAfterFirstClick,
          backgroundAfterSecondClick,
          timerTicks: state.timerTicks,
          activeListeners: state.activeListeners,
          activeTimers: state.activeTimers
        };

        const detachedButton = activeHarness.button;
        currentCleanup?.();
        const ticksAtCleanup = state.timerTicks;
        detachedButton.click();
        await new Promise((resolve) => window.setTimeout(resolve, 90));

        return {
          initializationCount: state.initializationCount,
          beforeInteraction,
          beforeCleanup,
          afterCleanup: {
            activeListeners: state.activeListeners,
            activeTimers: state.activeTimers,
            buttons: document.querySelectorAll('#r18-t043-toggle').length,
            panels: document.querySelectorAll('#r18-t043-generated-panel').length,
            clickEffectsAfterDetachedClick: state.clickEffects,
            timerTicksAtCleanup: ticksAtCleanup,
            timerTicksAfterWait: state.timerTicks
          }
        };
      } finally {
        currentCleanup?.();
      }
    });

    assert.equal(lifecycle.initializationCount, 2);
    assert.equal(lifecycle.beforeInteraction.buttons, 1, 'Only one toggle button should exist');
    assert.equal(lifecycle.beforeInteraction.panels, 1, 'Only one generated panel should exist');
    assert.equal(lifecycle.beforeInteraction.activeListeners, 1, 'Only one click listener should be active');
    assert.equal(lifecycle.beforeInteraction.activeTimers, 1, 'Only one interval should be active');
    assert.equal(lifecycle.beforeInteraction.panelDisplay, 'block');
    assert.ok(lifecycle.beforeInteraction.targetWidth > 0, 'Main content should have non-zero layout width');
    assert.ok(lifecycle.beforeInteraction.targetHeight > 0, 'Main content should have non-zero layout height');
    assert.equal(lifecycle.beforeCleanup.clickEffects, 2, 'Two clicks should cause exactly two effects');
    assert.equal(lifecycle.beforeCleanup.toggleCount, 2, 'Two clicks should cause exactly two style toggles');
    assert.notEqual(
      lifecycle.beforeCleanup.backgroundAfterFirstClick,
      lifecycle.beforeInteraction.targetBackground,
      'The first toggle should visibly change the computed background'
    );
    assert.equal(
      lifecycle.beforeCleanup.backgroundAfterSecondClick,
      lifecycle.beforeInteraction.targetBackground,
      'The second toggle should restore the computed background'
    );
    assert.equal(lifecycle.beforeCleanup.highlighted, false, 'Two toggles should restore the baseline class');
    assert.ok(lifecycle.beforeCleanup.timerTicks > 0, 'The single timer should run before cleanup');
    assert.equal(lifecycle.beforeCleanup.activeListeners, 1);
    assert.equal(lifecycle.beforeCleanup.activeTimers, 1);
    assert.equal(lifecycle.afterCleanup.activeListeners, 0, 'Cleanup should remove the test listener');
    assert.equal(lifecycle.afterCleanup.activeTimers, 0, 'Cleanup should clear the test timer');
    assert.equal(lifecycle.afterCleanup.buttons, 0, 'Cleanup should remove the generated button');
    assert.equal(lifecycle.afterCleanup.panels, 0, 'Cleanup should remove the generated panel');
    assert.equal(
      lifecycle.afterCleanup.clickEffectsAfterDetachedClick,
      2,
      'A detached button should not retain its event listener'
    );
    assert.equal(
      lifecycle.afterCleanup.timerTicksAfterWait,
      lifecycle.afterCleanup.timerTicksAtCleanup,
      'Timer ticks should stop after cleanup'
    );
    console.log('Isolated repeated-toggle lifecycle harness: passed');

    const unexpectedConsoleErrors = consoleErrors.filter(
      (entry) => !expectedError.test(entry.text)
    );
    assert.deepEqual(unexpectedConsoleErrors, [], 'No unexpected console errors should occur');
    assert.equal(
      pageErrors.length,
      3,
      'Only the two baseline duplicate-declaration errors and one repeated-script error are expected'
    );
    assert.ok(pageErrors.every((message) => expectedError.test(message)));

    await context.close();
  } finally {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  }
});
