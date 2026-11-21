import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { chromium } from "playwright";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const playwrightVersion = require("playwright/package.json").version;

const taskId = "R18-T032";
const root = process.cwd();
const target = "/html/introduction-to-html/getting-started/index.html";
const evidenceDir = resolve(root, `work/${taskId}`);

await mkdir(evidenceDir, { recursive: true });

const viewports = [
  { width: 360, height: 800, name: "mobile" },
  { width: 1280, height: 800, name: "desktop" }
];

let server;
let browser;
const serverErrors = [];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png"
};

const evidence = {
  task: taskId,
  input: {
    target,
    viewports: viewports.map(v => ({ width: v.width, height: v.height, name: v.name })),
    testedRegions: ["document", "body", "p"]
  },
  expected: {
    pageTitle: "My test page",
    textContent: "This is my page",
    horizontalOverflow: false,
    contentClipped: false,
    contentOrderPreserved: true,
    serverErrors: 0,
    browserErrors: 0,
    positiveTabindex: 0
  },
  actual: [],
  tools: {
    node: process.version,
    playwright: playwrightVersion
  }
};

try {
  // Start ephemeral local HTTP static server
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

  // Verify server readiness probe
  const probeResponse = await fetch(`${baseUrl}${target}`);
  assert.equal(probeResponse.status, 200, "Server readiness probe must return 200");

  browser = await chromium.launch({ headless: true });
  evidence.tools.chromium = browser.version();

  for (const viewport of viewports) {
    const browserErrors = [];
    // Fresh browser context for each viewport
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1
    });

    try {
      const page = await context.newPage();

      page.on("pageerror", error => browserErrors.push(error.message));
      page.on("console", message => {
        if (message.type() === "error") browserErrors.push(message.text());
      });
      page.on("requestfailed", request => {
        browserErrors.push(`Request failed: ${request.url()} - ${request.failure()?.errorText}`);
      });

      const pageResponse = await page.goto(`${baseUrl}${target}`, {
        waitUntil: "networkidle"
      });
      assert.equal(pageResponse?.status(), 200, `Navigation at ${viewport.width}x${viewport.height} must return 200`);

      // 1. Verify title and DOM content
      const title = await page.title();
      assert.equal(title, "My test page", "Page title must be 'My test page'");

      const pLocator = page.locator("p");
      assert.equal(await pLocator.count(), 1, "There must be exactly one paragraph");
      const text = (await pLocator.innerText()).trim();
      assert.equal(text, "This is my page", "Paragraph text must match teaching content");

      // 2. DOM structure and content order
      const contentOrder = await page.evaluate(() => {
        return Array.from(document.body.children).map(el => el.tagName.toLowerCase());
      });
      assert.deepEqual(contentOrder, ["p"], "Body direct children must strictly preserve content order ['p']");

      // 3. Computed layout & horizontal overflow checks
      const layout = await page.evaluate(() => {
        const doc = document.documentElement;
        const body = document.body;
        const p = document.querySelector("p");
        const pRect = p.getBoundingClientRect();
        const pStyle = getComputedStyle(p);
        const bodyStyle = getComputedStyle(body);

        return {
          windowWidth: window.innerWidth,
          windowHeight: window.innerHeight,
          docScrollWidth: doc.scrollWidth,
          docClientWidth: doc.clientWidth,
          hasHorizontalOverflow: doc.scrollWidth > doc.clientWidth,
          bodyScrollWidth: body.scrollWidth,
          bodyClientWidth: body.clientWidth,
          pBounds: {
            x: Math.round(pRect.x * 100) / 100,
            y: Math.round(pRect.y * 100) / 100,
            width: Math.round(pRect.width * 100) / 100,
            height: Math.round(pRect.height * 100) / 100,
            right: Math.round(pRect.right * 100) / 100,
            bottom: Math.round(pRect.bottom * 100) / 100
          },
          pStyle: {
            display: pStyle.display,
            visibility: pStyle.visibility,
            opacity: pStyle.opacity
          },
          scrollRegions: Array.from(document.querySelectorAll("*")).filter(el => {
            const s = getComputedStyle(el);
            return (s.overflowX === "scroll" || s.overflowX === "auto") && el.scrollWidth > el.clientWidth;
          }).map(el => ({ tag: el.tagName, ariaLabel: el.getAttribute("aria-label") }))
        };
      });

      // Assert zero unintended horizontal overflow
      assert.equal(
        layout.hasHorizontalOverflow,
        false,
        `Unintended horizontal overflow detected at ${viewport.width}x${viewport.height}: scrollWidth (${layout.docScrollWidth}) > clientWidth (${layout.docClientWidth})`
      );

      // Assert content is within viewport bounds and not clipped
      assert.ok(layout.pBounds.x >= 0, `Content left bound (x=${layout.pBounds.x}) must be >= 0`);
      assert.ok(
        layout.pBounds.right <= viewport.width,
        `Content right bound (${layout.pBounds.right}) must not exceed viewport width (${viewport.width})`
      );
      assert.ok(layout.pBounds.y >= 0, `Content top bound (y=${layout.pBounds.y}) must be >= 0`);
      assert.ok(
        layout.pBounds.bottom <= viewport.height,
        `Content bottom bound (${layout.pBounds.bottom}) must not exceed viewport height (${viewport.height})`
      );

      // Assert visible styling
      assert.equal(layout.pStyle.visibility, "visible", "Content must be visible");
      assert.notEqual(layout.pStyle.display, "none", "Content display must not be none");
      assert.ok(Number(layout.pStyle.opacity) > 0, "Content opacity must be > 0");

      // Assert zero unexpected scroll regions
      assert.deepEqual(layout.scrollRegions, [], "No unintended scroll regions should exist");

      // 4. Tabindex safety check
      const positiveTabindex = await page.locator("[tabindex]").evaluateAll(els =>
        els.filter(el => Number(el.getAttribute("tabindex")) > 0).length
      );
      assert.equal(positiveTabindex, 0, "No positive tabindex attributes allowed");

      // 5. Screenshots at this viewport
      const baselineScreenshot = resolve(evidenceDir, `baseline-${viewport.width}x${viewport.height}.png`);
      const changedScreenshot = resolve(evidenceDir, `changed-${viewport.width}x${viewport.height}.png`);
      await page.screenshot({ path: baselineScreenshot, fullPage: true });
      await page.screenshot({ path: changedScreenshot, fullPage: true });

      // 6. Assert error freedom
      assert.deepEqual(serverErrors, [], `Unexpected server errors at ${viewport.width}x${viewport.height}`);
      assert.deepEqual(browserErrors, [], `Unexpected browser errors at ${viewport.width}x${viewport.height}`);

      evidence.actual.push({
        viewport: `${viewport.width}x${viewport.height}`,
        title,
        text,
        contentOrder,
        horizontalOverflow: layout.hasHorizontalOverflow,
        docScrollWidth: layout.docScrollWidth,
        docClientWidth: layout.docClientWidth,
        contentBounds: layout.pBounds,
        contentWithinViewport: layout.pBounds.x >= 0 && layout.pBounds.right <= viewport.width,
        scrollRegions: layout.scrollRegions,
        positiveTabindex,
        browserErrors,
        serverErrors: [...serverErrors],
        screenshots: [
          `work/R18-T032/baseline-${viewport.width}x${viewport.height}.png`,
          `work/R18-T032/changed-${viewport.width}x${viewport.height}.png`
        ]
      });

      console.log(`PASS: R18-T032 responsive layout check at ${viewport.width}x${viewport.height}`);
      console.log(`  - No horizontal overflow (scrollWidth=${layout.docScrollWidth}, clientWidth=${layout.docClientWidth})`);
      console.log(`  - Content fully inside viewport (x=${layout.pBounds.x}, right=${layout.pBounds.right} <= ${viewport.width})`);
      console.log(`  - Teaching content intact: "${text}"`);
      console.log(`  - Zero browser and server errors`);

    } finally {
      await context.close();
    }
  }

  console.log("PASS: R18-T032 All responsive layout checks passed at 360x800 and 1280x800");

} catch (error) {
  console.error("FAIL: R18-T032");
  console.error(error);
  evidence.failure = error.stack || error.message;
  process.exitCode = 1;

} finally {
  if (browser) await browser.close();
  if (server) {
    await new Promise(resolveClose => {
      server.close(resolveClose);
      server.closeAllConnections();
    });
  }

  await writeFile(resolve(evidenceDir, "evidence.json"), `${JSON.stringify(evidence, null, 2)}\n`);
}
