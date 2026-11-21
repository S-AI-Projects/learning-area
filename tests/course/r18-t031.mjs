import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { chromium } from "playwright";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const playwrightVersion = require("playwright/package.json").version;

const taskId = "R18-T031";
const root = process.cwd();
const target = "/javascript/asynchronous/sequencing-animations/start/index.html";
const evidenceDir = resolve(root, `work/${taskId}`);

await mkdir(evidenceDir, { recursive: true });

let server;
let browser;
let context;

const browserErrors = [];
const serverErrors = [];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json; charset=utf-8"
};

const evidence = {
  task: taskId,
  input: {
    target,
    viewport: { width: 1280, height: 720 },
    keyboardInteractions: ["Tab", "Enter"]
  },
  expected: "All strict browser assertions pass, skip link is keyboard reachable with visible focus and activates cleanly to #alice-container, preserving demo CSS behavior, and no unexpected page or server errors occur.",
  actual: {},
  tools: {
    node: process.version,
    playwright: playwrightVersion
  }
};

try {
  // Start ephemeral local HTTP server
  server = createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, "http://127.0.0.1").pathname;
      const file = resolve(root, "." + pathname);
      assert.ok(file === root || file.startsWith(root + sep), "Request must stay inside repository root");
      const content = await readFile(file);
      res.writeHead(200, {
        "Content-Type": mimeTypes[extname(file)] || "application/octet-stream"
      });
      res.end(content);
    } catch (error) {
      serverErrors.push(`Server error for ${req.url}: ${error.message}`);
      res.writeHead(error.code === "ENOENT" ? 404 : 500);
      res.end("Static server error");
    }
  });

  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });

  const address = server.address();
  assert.ok(address && typeof address === "object", "Server address must be valid");
  const baseUrl = `http://127.0.0.1:${address.port}`;
  evidence.localServer = baseUrl;

  // Verify server readiness
  const probeResponse = await fetch(`${baseUrl}${target}`);
  assert.equal(probeResponse.status, 200, "Server readiness probe must return 200");

  browser = await chromium.launch({ headless: true });
  evidence.tools.chromium = browser.version();

  // Fresh browser context
  context = await browser.newContext({
    viewport: { width: 1280, height: 720 }
  });
  const page = await context.newPage();

  page.on("pageerror", error => {
    browserErrors.push(error.message);
  });

  page.on("console", message => {
    if (message.type() === "error") {
      browserErrors.push(message.text());
    }
  });

  page.on("requestfailed", request => {
    browserErrors.push(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
  });

  const pageResponse = await page.goto(`${baseUrl}${target}`, {
    waitUntil: "networkidle"
  });
  assert.equal(pageResponse?.status(), 200, "Target page navigation must return 200");

  // 1. Structure assertions for teaching example preservation
  const aliceContainer = page.locator("#alice-container");
  assert.equal(await aliceContainer.count(), 1, "Container #alice-container must exist");
  assert.equal(await aliceContainer.getAttribute("tabindex"), "-1", "#alice-container must have tabindex=-1 for accessible programmatic focus");

  const images = page.locator("#alice-container img");
  assert.equal(await images.count(), 3, "#alice-container must retain all 3 Alice images");

  const imageIds = await images.evaluateAll(imgs => imgs.map(img => img.id));
  assert.deepEqual(imageIds, ["alice1", "alice2", "alice3"], "Alice images must retain ids alice1, alice2, alice3");

  // 2. Computed layout assertions to verify CSS behavior is preserved
  const bodyLayout = await page.locator("body").evaluate(el => {
    const s = getComputedStyle(el);
    return { display: s.display, justifyContent: s.justifyContent, backgroundColor: s.backgroundColor };
  });
  assert.equal(bodyLayout.display, "flex", "Body display must remain flex");
  assert.equal(bodyLayout.justifyContent, "center", "Body justifyContent must remain center");
  assert.equal(bodyLayout.backgroundColor, "rgb(108, 55, 63)", "Body background color must remain #6c373f");

  const containerLayout = await aliceContainer.evaluate(el => {
    const s = getComputedStyle(el);
    return { display: s.display, placeItems: s.placeItems, gridTemplateAreas: s.gridTemplateAreas };
  });
  assert.equal(containerLayout.display, "grid", "Container display must remain grid");
  assert.equal(containerLayout.placeItems, "center", "Container placeItems must remain center");

  // 3. Skip link existence and initial hidden/off-screen state
  const skipLink = page.getByRole("link", { name: /skip to (?:main )?content/i });
  assert.equal(await skipLink.count(), 1, "Exactly one skip-to-content link must exist");
  assert.equal(await skipLink.getAttribute("href"), "#alice-container", "Skip link must point to #alice-container");

  const initialLinkBounds = await skipLink.evaluate(el => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return { top: s.top, rectTop: r.top, position: s.position };
  });
  assert.equal(initialLinkBounds.position, "absolute", "Skip link must be absolutely positioned");
  assert.ok(initialLinkBounds.rectTop < 0, "Skip link must be positioned off-screen before focus");

  // 4. Tab traversal to skip link
  await page.keyboard.press("Tab");

  const isSkipFocused = await skipLink.evaluate(el => el === document.activeElement);
  assert.equal(isSkipFocused, true, "First Tab press must focus the skip link");

  // 5. Visible focus check
  const focusStyle = await skipLink.evaluate(el => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return {
      top: s.top,
      left: s.left,
      visibility: s.visibility,
      display: s.display,
      opacity: s.opacity,
      outlineStyle: s.outlineStyle,
      outlineWidth: s.outlineWidth,
      bounds: { x: r.x, y: r.y, right: r.right, bottom: r.bottom },
      viewport: { width: window.innerWidth, height: window.innerHeight }
    };
  });

  assert.equal(focusStyle.visibility, "visible", "Focused skip link must have visibility: visible");
  assert.notEqual(focusStyle.display, "none", "Focused skip link must not be display: none");
  assert.ok(Number(focusStyle.opacity) > 0, "Focused skip link opacity must be > 0");
  assert.notEqual(focusStyle.outlineStyle, "none", "Focused skip link must have visible outline style");
  assert.ok(parseFloat(focusStyle.outlineWidth) >= 1, "Focused skip link outline width must be >= 1px");

  assert.ok(focusStyle.bounds.x >= 0, "Focused skip link must be inside viewport horizontally (x >= 0)");
  assert.ok(focusStyle.bounds.y >= 0, "Focused skip link must be inside viewport vertically (y >= 0)");
  assert.ok(focusStyle.bounds.right <= focusStyle.viewport.width, "Focused skip link must fit within viewport width");
  assert.ok(focusStyle.bounds.bottom <= focusStyle.viewport.height, "Focused skip link must fit within viewport height");

  // Capture changed focused screenshot
  await page.screenshot({ path: resolve(evidenceDir, "changed-focused.png") });

  // 6. Keyboard activation (Enter key)
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => window.location.hash === "#alice-container");

  assert.equal(await page.evaluate(() => window.location.hash), "#alice-container", "Activating skip link must set fragment to #alice-container");

  const isContainerFocused = await aliceContainer.evaluate(el => el === document.activeElement);
  assert.equal(isContainerFocused, true, "Activating skip link must move focus to #alice-container");

  // 7. Reject positive tabindex values
  const positiveTabindexes = await page.locator("[tabindex]").evaluateAll(els =>
    els.filter(el => Number(el.getAttribute("tabindex")) > 0).map(el => ({ tag: el.tagName, tabindex: el.getAttribute("tabindex") }))
  );
  assert.equal(positiveTabindexes.length, 0, `No positive tabindex allowed: ${JSON.stringify(positiveTabindexes)}`);

  // 8. Reject unexpected errors
  assert.deepEqual(serverErrors, [], `Unexpected local server errors: ${serverErrors.join("; ")}`);
  assert.deepEqual(browserErrors, [], `Unexpected browser/page errors: ${browserErrors.join("; ")}`);

  evidence.actual = {
    teachingPreserved: {
      containerExists: true,
      imagesPreserved: imageIds
    },
    cssPreserved: {
      bodyLayout,
      containerLayout
    },
    skipLink: {
      href: "#alice-container",
      initialOffscreen: initialLinkBounds.rectTop < 0,
      focusedOnTab: isSkipFocused,
      visibleFocus: {
        withinViewport: true,
        bounds: focusStyle.bounds,
        outlineStyle: focusStyle.outlineStyle,
        outlineWidth: focusStyle.outlineWidth
      },
      keyboardActivatedOnEnter: true,
      targetFocused: isContainerFocused
    },
    positiveTabindexes: 0,
    serverErrors: 0,
    browserErrors: 0
  };

  console.log("PASS: R18-T031 keyboard accessibility check");
  console.log("PASS: Static demo skip link present");
  console.log("PASS: Tab traversal successfully focuses skip link");
  console.log("PASS: Visible focus indicator inside viewport");
  console.log("PASS: Enter activation navigates to #alice-container");
  console.log("PASS: #alice-container receives focus");
  console.log("PASS: CSS behavior and teaching structure preserved");
  console.log("PASS: No positive tabindex values");
  console.log("PASS: No server or browser errors");

} catch (error) {
  console.error("FAIL: R18-T031");
  console.error(error);
  evidence.failure = error.stack || error.message;
  process.exitCode = 1;

} finally {
  if (context) await context.close();
  if (browser) await browser.close();
  if (server) {
    await new Promise(resolveClose => {
      server.close(resolveClose);
      server.closeAllConnections();
    });
  }

  await writeFile(resolve(evidenceDir, "evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`);
}
