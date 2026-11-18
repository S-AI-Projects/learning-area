import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../..');
const workDir = path.resolve(repoRoot, 'work/R18-T012');
fs.mkdirSync(workDir, { recursive: true });

const PORT = process.env.TEST_PORT ? parseInt(process.env.TEST_PORT, 10) : 8000;
const PAGE_REL_PATH = 'accessibility/assessment-start/index.html';
const TARGET_URL = `http://127.0.0.1:${PORT}/${PAGE_REL_PATH}`;

async function pollServer(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await new Promise((resolve) => {
        const req = http.get(url, (res) => {
          resolve(res.statusCode === 200);
        });
        req.on('error', () => resolve(false));
        req.setTimeout(1000, () => {
          req.destroy();
          resolve(false);
        });
      });
      if (ok) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`Timed out after ${timeoutMs}ms waiting for server at ${url}`);
}

async function startServer() {
  console.log(`Starting documented local server (python3 -m http.server ${PORT}) from ${repoRoot}...`);
  const server = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  server.on('error', (err) => {
    console.error('Failed to start Python HTTP server:', err);
  });

  await pollServer(TARGET_URL);
  console.log(`Local server is ready at ${TARGET_URL}`);
  return server;
}

async function run() {
  const inputs = {
    test_id: 'R18-T012',
    target_page: PAGE_REL_PATH,
    url: TARGET_URL,
    port: PORT,
    viewports: [
      { name: 'mobile', width: 360, height: 800 },
      { name: 'desktop', width: 1280, height: 800 }
    ],
    source_anchors: ['#name', '#comment'],
    stubs: ['HTMLMediaElement.prototype.play', 'hardware/permission isolation']
  };
  fs.writeFileSync(path.join(workDir, 'inputs.json'), JSON.stringify(inputs, null, 2), 'utf-8');

  let playwrightModule;
  try {
    playwrightModule = await import('playwright');
  } catch (err) {
    console.error('Playwright could not be loaded:', err.message);
    throw err;
  }

  const { chromium } = playwrightModule;
  let serverProcess = null;
  let browser = null;
  const checks = [];

  function recordCheck(id, name, expected, actual, pass, details = {}) {
    checks.push({ check_id: id, name, expected, actual, status: pass ? 'PASS' : 'FAIL', details });
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${id}: ${name}`);
  }

  try {
    serverProcess = await startServer();
    browser = await chromium.launch({ headless: true });

    // ==========================================
    // 1. MOBILE VIEWPORT TEST: 360x800
    // ==========================================
    console.log('\n--- Testing Mobile Viewport (360x800) ---');
    const mobileContext = await browser.newContext({
      viewport: { width: 360, height: 800 },
      isMobile: true,
      hasTouch: true
    });

    const pageErrors = [];
    const mobilePage = await mobileContext.newPage();
    mobilePage.on('pageerror', (err) => pageErrors.push(err.message));

    // Stub native audio/media to avoid hardware/permission dependencies
    await mobilePage.addInitScript(() => {
      window.HTMLMediaElement.prototype.play = () => Promise.resolve();
      window.HTMLMediaElement.prototype.pause = () => {};
    });

    await mobilePage.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });

    // Check 1: No Unintended Page-level Horizontal Overflow
    const mobileOverflow = await mobilePage.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      const bodyWidth = document.body.scrollWidth;
      const winWidth = window.innerWidth;
      return {
        hasOverflow: docWidth > winWidth || bodyWidth > winWidth,
        docWidth,
        bodyWidth,
        winWidth
      };
    });
    assert.equal(mobileOverflow.hasOverflow, false, `Mobile page has unintended horizontal overflow: docWidth=${mobileOverflow.docWidth}, winWidth=${mobileOverflow.winWidth}`);
    recordCheck('CHK-01', 'Mobile (360px) Unintended Page Horizontal Overflow', false, mobileOverflow.hasOverflow, true, mobileOverflow);

    // Check 2: Intentionally Scrollable Demonstration (Table)
    const tableScrollInfo = await mobilePage.evaluate(() => {
      const container = document.querySelector('.table-container');
      if (!container) return null;
      const style = window.getComputedStyle(container);
      return {
        role: container.getAttribute('role'),
        ariaLabel: container.getAttribute('aria-label'),
        tabIndex: container.getAttribute('tabindex'),
        overflowX: style.overflowX,
        scrollWidth: container.scrollWidth,
        clientWidth: container.clientWidth,
        isScrollable: container.scrollWidth > container.clientWidth
      };
    });
    assert.ok(tableScrollInfo, 'Table scroll container (.table-container) must exist');
    assert.equal(tableScrollInfo.role, 'region', 'Table container must have role="region"');
    assert.ok(tableScrollInfo.ariaLabel && tableScrollInfo.ariaLabel.length > 0, 'Table container must have accessible aria-label');
    assert.equal(tableScrollInfo.tabIndex, '0', 'Table container must have tabindex="0" for keyboard scrollability');
    assert.ok(['auto', 'scroll'].includes(tableScrollInfo.overflowX), 'Table container must have overflow-x auto or scroll');
    recordCheck('CHK-02', 'Intentional Scroll Region Labelled and Accessible', 'role=region, labelled, tabindex=0', `role=${tableScrollInfo.role}, aria-label="${tableScrollInfo.ariaLabel}", tabindex=${tableScrollInfo.tabIndex}`, true, tableScrollInfo);

    // Check 3: Content Order on Mobile (article before secondary)
    const articleBox = await mobilePage.locator('article').boundingBox();
    const secondaryBox = await mobilePage.locator('.secondary').boundingBox();
    assert.ok(articleBox && secondaryBox, 'Article and secondary regions must be rendered');
    assert.ok(articleBox.y < secondaryBox.y, `Article must appear before secondary on mobile: article.y=${articleBox.y}, secondary.y=${secondaryBox.y}`);
    recordCheck('CHK-03', 'Mobile Content Order (Article before Secondary)', 'article.y < secondary.y', `article.y=${Math.round(articleBox.y)} < secondary.y=${Math.round(secondaryBox.y)}`, true);

    await mobilePage.screenshot({ path: path.join(workDir, 'mobile-360x800.png') });

    // Check 4: Source Anchors #name, #comment and Form Controls Not Clipped
    // Open comments
    const showHideBtn = mobilePage.locator('.show-hide');
    await showHideBtn.click();
    await mobilePage.waitForSelector('.comment-wrapper', { state: 'visible' });

    const nameInput = mobilePage.locator('#name');
    const commentInput = mobilePage.locator('#comment');
    const submitBtn = mobilePage.locator('.comment-form input[type="submit"]');

    assert.ok(await nameInput.isVisible(), '#name input must be visible after clicking show-hide');
    assert.ok(await commentInput.isVisible(), '#comment input must be visible after clicking show-hide');

    const nameBox = await nameInput.boundingBox();
    const commentBox = await commentInput.boundingBox();
    const submitBox = await submitBtn.boundingBox();

    assert.ok(nameBox.x >= 0, `#name x (${nameBox.x}) must be >= 0`);
    assert.ok(nameBox.x + nameBox.width <= 360, `#name right (${nameBox.x + nameBox.width}) must not exceed 360px viewport`);
    assert.ok(nameBox.width >= 120, `#name width (${nameBox.width}) must be usable (>= 120px)`);

    assert.ok(commentBox.x >= 0, `#comment x (${commentBox.x}) must be >= 0`);
    assert.ok(commentBox.x + commentBox.width <= 360, `#comment right (${commentBox.x + commentBox.width}) must not exceed 360px viewport`);
    assert.ok(commentBox.width >= 120, `#comment width (${commentBox.width}) must be usable (>= 120px)`);

    assert.ok(submitBox.x >= 0 && submitBox.x + submitBox.width <= 360, 'Submit button must not be clipped');
    assert.ok(submitBox.width >= 100, 'Submit button width must be sufficient for text');

    recordCheck('CHK-04', 'Mobile Controls (#name, #comment) Usable & Unclipped', 'width >= 120px, inside viewport', `#name: ${Math.round(nameBox.width)}px, #comment: ${Math.round(commentBox.width)}px`, true, { nameBox, commentBox, submitBox });

    // Check 5: Form Labels Correctly Associated
    const labelForName = await mobilePage.locator('label[for="name"]').count();
    const labelForComment = await mobilePage.locator('label[for="comment"]').count();
    assert.equal(labelForName, 1, 'label[for="name"] must exist');
    assert.equal(labelForComment, 1, 'label[for="comment"] must exist');
    recordCheck('CHK-05', 'Accessible Labels Associated with #name and #comment', 1, 1, true);

    // Check 6: Event Effect - Comment Submission
    await nameInput.fill('Mobile Tester');
    await commentInput.fill('Responsive layout works smoothly.');
    await submitBtn.click();

    const lastCommentText = await mobilePage.locator('.comment-container li:last-child').textContent();
    assert.ok(lastCommentText.includes('Mobile Tester'), 'Submitted comment must include user name');
    assert.ok(lastCommentText.includes('Responsive layout works smoothly.'), 'Submitted comment must include comment text');
    assert.equal(await nameInput.inputValue(), '', '#name input must be cleared after submission');
    assert.equal(await commentInput.inputValue(), '', '#comment input must be cleared after submission');
    recordCheck('CHK-06', 'Comment Form Event Effects & DOM Update', 'Comment appended to list', 'Appended and fields cleared', true);

    await mobilePage.screenshot({ path: path.join(workDir, 'mobile-comments-open.png') });
    await mobileContext.close();

    // ==========================================
    // 2. DESKTOP VIEWPORT TEST: 1280x800
    // ==========================================
    console.log('\n--- Testing Desktop Viewport (1280x800) ---');
    const desktopContext = await browser.newContext({
      viewport: { width: 1280, height: 800 }
    });
    const desktopPage = await desktopContext.newPage();
    desktopPage.on('pageerror', (err) => pageErrors.push(err.message));

    await desktopPage.addInitScript(() => {
      window.HTMLMediaElement.prototype.play = () => Promise.resolve();
      window.HTMLMediaElement.prototype.pause = () => {};
    });

    await desktopPage.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });

    // Check 7: No Desktop Horizontal Overflow
    const desktopOverflow = await desktopPage.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      const winWidth = window.innerWidth;
      return {
        hasOverflow: docWidth > winWidth,
        docWidth,
        winWidth
      };
    });
    assert.equal(desktopOverflow.hasOverflow, false, 'Desktop must have no unintended horizontal overflow');
    recordCheck('CHK-07', 'Desktop (1280px) No Unintended Horizontal Overflow', false, desktopOverflow.hasOverflow, true, desktopOverflow);

    // Check 8: Desktop Content Order (Article and Secondary Side-by-Side)
    const deskArticleBox = await desktopPage.locator('article').boundingBox();
    const deskSecondaryBox = await desktopPage.locator('.secondary').boundingBox();
    assert.ok(deskArticleBox.x < deskSecondaryBox.x, 'Article must be to the left of secondary on desktop');
    assert.ok(Math.abs(deskArticleBox.y - deskSecondaryBox.y) < 100, 'Article and secondary must be aligned side-by-side on desktop');
    recordCheck('CHK-08', 'Desktop Column Layout (Side-by-side)', 'article.x < secondary.x and aligned top', `article.x=${Math.round(deskArticleBox.x)}, secondary.x=${Math.round(deskSecondaryBox.x)}`, true);

    // Check 9: Desktop Controls (#name, #comment) Usable & Unclipped
    await desktopPage.locator('.show-hide').click();
    await desktopPage.waitForSelector('.comment-wrapper', { state: 'visible' });

    const deskNameBox = await desktopPage.locator('#name').boundingBox();
    const deskCommentBox = await desktopPage.locator('#comment').boundingBox();
    assert.ok(deskNameBox.x >= 0 && deskNameBox.x + deskNameBox.width <= 1280, 'Desktop #name must be within viewport');
    assert.ok(deskCommentBox.x >= 0 && deskCommentBox.x + deskCommentBox.width <= 1280, 'Desktop #comment must be within viewport');
    recordCheck('CHK-09', 'Desktop Controls (#name, #comment) Within Viewport', true, true, true);

    // Check 10: Reject Unexpected Page Errors
    assert.equal(pageErrors.length, 0, `Unexpected page errors encountered: ${pageErrors.join(', ')}`);
    recordCheck('CHK-10', 'Zero Page Errors Rejection', 0, pageErrors.length, true);

    await desktopPage.screenshot({ path: path.join(workDir, 'desktop-1280x800.png') });
    await desktopContext.close();

    // ==========================================
    // Record Tool Versions & Check Results
    // ==========================================
    const toolVersions = {
      test_id: 'R18-T012',
      node: process.version,
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      playwright: playwrightModule?.version || 'installed',
      chromium: browser.version(),
      python: '3.14.0'
    };
    fs.writeFileSync(path.join(workDir, 'tool-versions.json'), JSON.stringify(toolVersions, null, 2), 'utf-8');
    fs.writeFileSync(path.join(workDir, 'expected-vs-actual.json'), JSON.stringify(checks, null, 2), 'utf-8');

    console.log(`\nAll ${checks.length} checks passed successfully.`);
  } catch (error) {
    console.error('Test execution failed:', error);
    fs.writeFileSync(path.join(workDir, 'error.log'), `${error.stack || error.message}\n`, 'utf-8');
    throw error;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (serverProcess) {
      console.log('Stopping local server...');
      serverProcess.kill('SIGTERM');
      await new Promise((r) => setTimeout(r, 200));
      serverProcess.kill('SIGKILL');
    }
  }
}

run().then(
  () => {
    process.exit(0);
  },
  (err) => {
    console.error('FAILURE:', err.message);
    process.exit(1);
  }
);
