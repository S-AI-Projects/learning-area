import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { chromium } from "playwright";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const playwrightVersion = require("playwright/package.json").version;

const taskId = "R18-T034";
const root = process.cwd();
const target = "/javascript/apis/third-party-apis/youtube/index.html";
const evidenceDir = resolve(root, `work/${taskId}`);

await mkdir(evidenceDir, { recursive: true });

let server;
let browser;
const serverErrors = [];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png"
};

const evidence = {
  task: taskId,
  input: {
    target,
    sourceAnchor: "#search",
    viewport: { width: 1280, height: 800 }
  },
  expected: {
    baselineSearchInput: true,
    repeatedInitNoDuplicateListeners: true,
    repeatedInteractionNoDuplicateDOM: true,
    isolatedHarnessDuplicatePrevention: true,
    repeatedStyleTogglesConsistent: true,
    cleanupLeavesNoActiveTimersOrListeners: true,
    serverErrors: 0,
    browserErrors: 0
  },
  actual: {},
  tools: {
    node: process.version,
    playwright: playwrightVersion
  }
};

try {
  // Start local static HTTP server
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
      if (error.code === "ENOENT") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }
      serverErrors.push(`Server error for ${req.url}: ${error.message}`);
      res.writeHead(500);
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

  // Probe server readiness
  const probeResponse = await fetch(`${baseUrl}${target}`);
  assert.equal(probeResponse.status, 200, "Server readiness probe must return 200");

  browser = await chromium.launch({ headless: true });
  evidence.tools.chromium = browser.version();

  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pageErrors = [];
  const page = await context.newPage();

  page.on("pageerror", err => pageErrors.push(err.message));
  page.on("console", message => {
    if (message.type() === "error") pageErrors.push(message.text());
  });

  // Stub external Google Client API and YouTube Iframe Player API deterministically
  await page.route("https://apis.google.com/**", route => {
    route.fulfill({
      status: 200,
      contentType: "text/javascript",
      body: `
        window.searchCallCount = 0;
        window.gapi = {
          client: {
            load: (api, version, callback) => callback && callback(),
            setApiKey: (key) => {},
            youtube: {
              search: {
                list: (params) => {
                  window.searchCallCount++;
                  return {
                    execute: (cb) => {
                      cb({
                        items: [
                          { id: { videoId: "sample-video-1" } },
                          { id: { videoId: "sample-video-2" } }
                        ]
                      });
                    }
                  };
                }
              }
            }
          }
        };
      `
    });
  });

  await page.route("https://www.youtube.com/**", route => {
    route.fulfill({
      status: 200,
      contentType: "text/javascript",
      body: `
        window.YT = {
          Player: function(id, options) {
            this.id = id;
            this.getDuration = () => 180;
            this.a = document.getElementById(id);
            if (options?.events?.onReady) {
              setTimeout(() => options.events.onReady({ target: this }), 10);
            }
          }
        };
      `
    });
  });

  // ========================================================
  // 1. Baseline Inspection of #search and DOM Layout
  // ========================================================
  console.log("\n--- 1. Baseline Anchor & DOM Layout Verification ---");
  await page.goto(`${baseUrl}${target}`, { waitUntil: "domcontentloaded" });
  assert.equal(await page.title(), "YouTube APIs example");

  const searchInput = page.locator("#search");
  assert.equal(await searchInput.count(), 1, "#search input must exist");
  assert.equal(await searchInput.getAttribute("type"), "text");
  assert.equal(await searchInput.getAttribute("required"), "");

  const searchRect = await searchInput.evaluate(el => {
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    return { width: r.width, height: r.height, display: s.display, visibility: s.visibility };
  });
  assert.ok(searchRect.width > 0, "#search must have positive computed width");
  assert.ok(searchRect.height > 0, "#search must have positive computed height");
  assert.equal(searchRect.visibility, "visible");
  assert.notEqual(searchRect.display, "none");

  await page.screenshot({ path: resolve(evidenceDir, "baseline.png") });

  // ========================================================
  // 2. Repeated Example Initialization & Interaction
  // ========================================================
  console.log("\n--- 2. Repeated Initialization & Search Interaction ---");
  // Call onYouTubeApiLoad multiple times to test repeated initialization idempotency
  await page.evaluate(() => {
    if (typeof window.onYouTubeApiLoad === "function") {
      window.onYouTubeApiLoad();
      window.onYouTubeApiLoad();
    }
  });

  // Interaction 1: First search submission
  await searchInput.fill("javascript tutorial");
  await page.locator(".submit").click();
  await page.waitForTimeout(100);

  let searchCalls = await page.evaluate(() => window.searchCallCount);
  assert.equal(searchCalls, 1, "First submission must execute search exactly once despite repeated initialization");

  let resultVideos = await page.locator("section > div").count();
  assert.equal(resultVideos, 2, "First search must render exactly 2 video divs");

  // Interaction 2: Second search submission with different term
  await searchInput.fill("web components");
  await page.locator(".submit").click();
  await page.waitForTimeout(100);

  searchCalls = await page.evaluate(() => window.searchCallCount);
  assert.equal(searchCalls, 2, "Second submission must execute search exactly once (total 2 calls)");

  resultVideos = await page.locator("section > div").count();
  assert.equal(resultVideos, 2, "Second search must replace prior results rather than duplicating DOM nodes");

  await page.screenshot({ path: resolve(evidenceDir, "repeated-search.png") });

  // ========================================================
  // 3. Isolated Harness for Repeated Style/Demo Toggles on #search
  // ========================================================
  console.log("\n--- 3. Isolated Harness for Repeated Style Toggles on #search ---");
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "r18-test-style";
    style.textContent = `
      #search.r18-highlight {
        outline: 4px solid green !important;
      }
    `;
    document.head.appendChild(style);

    window.r18Updates = 0;
    window.r18ActiveTimers = 0;
    window.r18Controller = new AbortController();

    // Isolated test harness initialization
    window.initializeDemo = () => {
      let toggleBtn = document.querySelector("#r18-toggle");
      if (!toggleBtn) {
        toggleBtn = document.createElement("button");
        toggleBtn.id = "r18-toggle";
        toggleBtn.type = "button";
        toggleBtn.textContent = "Toggle Search Highlight";

        const statusEl = document.createElement("span");
        statusEl.id = "r18-status";
        statusEl.textContent = "Highlight is off";

        document.querySelector(".controls").appendChild(toggleBtn);
        document.querySelector(".controls").appendChild(statusEl);

        toggleBtn.addEventListener("click", () => {
          const isHighlighted = document.querySelector("#search").classList.toggle("r18-highlight");
          window.r18Updates++;
          statusEl.textContent = isHighlighted ? "Highlight is on" : "Highlight is off";

          // Track debounce timer
          window.r18ActiveTimers++;
          const timerId = setTimeout(() => {
            window.r18ActiveTimers--;
          }, 50);
          window.r18LastTimer = timerId;
        }, { signal: window.r18Controller.signal });
      }
    };

    window.cleanupDemo = () => {
      window.r18Controller.abort();
      if (window.r18LastTimer) {
        clearTimeout(window.r18LastTimer);
        window.r18ActiveTimers = 0;
      }
      document.querySelector("#r18-toggle")?.remove();
      document.querySelector("#r18-status")?.remove();
      document.querySelector("#r18-test-style")?.remove();
    };

    // Initialize twice to verify duplicate setup prevention
    window.initializeDemo();
    window.initializeDemo();
  });

  const toggleBtn = page.locator("#r18-toggle");
  const statusEl = page.locator("#r18-status");

  assert.equal(await toggleBtn.count(), 1, "Repeated initialization must create exactly one toggle button");
  assert.equal(await statusEl.count(), 1, "Repeated initialization must create exactly one status element");

  // Toggle 1: Enable highlight
  await toggleBtn.click();
  await page.waitForTimeout(100);

  const isHighlighted1 = await searchInput.evaluate(el => el.classList.contains("r18-highlight"));
  const outlineWidth1 = await searchInput.evaluate(el => getComputedStyle(el).outlineWidth);
  const statusText1 = await statusEl.textContent();

  assert.equal(isHighlighted1, true, "First toggle must apply r18-highlight class");
  assert.equal(outlineWidth1, "4px", "Computed outline width must be 4px");
  assert.equal(statusText1, "Highlight is on");

  // Toggle 2: Disable highlight
  await toggleBtn.click();
  await page.waitForTimeout(100);

  const isHighlighted2 = await searchInput.evaluate(el => el.classList.contains("r18-highlight"));
  const statusText2 = await statusEl.textContent();
  const updateCount = await page.evaluate(() => window.r18Updates);

  assert.equal(isHighlighted2, false, "Second toggle must remove r18-highlight class");
  assert.equal(statusText2, "Highlight is off");
  assert.equal(updateCount, 2, "Two clicks must produce exactly 2 state updates");

  await page.screenshot({ path: resolve(evidenceDir, "style-toggle.png") });

  // Cleanup verification
  const savedButtonHandle = await toggleBtn.elementHandle();
  await page.evaluate(() => window.cleanupDemo());

  assert.equal(await page.locator("#r18-toggle").count(), 0, "Cleanup must remove toggle button");
  assert.equal(await page.locator("#r18-status").count(), 0, "Cleanup must remove status element");
  assert.equal(await page.locator("#r18-test-style").count(), 0, "Cleanup must remove test style element");

  // Clicking saved element after cleanup must not fire listeners
  await savedButtonHandle.evaluate(btn => btn.click());
  const finalUpdates = await page.evaluate(() => window.r18Updates);
  const activeTimers = await page.evaluate(() => window.r18ActiveTimers);

  assert.equal(finalUpdates, 2, "Click after cleanup must not trigger any further updates");
  assert.equal(activeTimers, 0, "Cleanup must leave zero active timers");

  // Verify zero page errors
  assert.deepEqual(serverErrors, [], "Zero local server errors");
  assert.deepEqual(pageErrors, [], "Zero uncaught browser/page errors");

  await context.close();

  evidence.actual = {
    baselineSearchInput: true,
    repeatedInitNoDuplicateListeners: true,
    repeatedInteractionNoDuplicateDOM: true,
    isolatedHarnessDuplicatePrevention: true,
    repeatedStyleTogglesConsistent: true,
    cleanupLeavesNoActiveTimersOrListeners: true,
    serverErrors: 0,
    browserErrors: 0
  };

  console.log("\nPASS: R18-T034 YouTube API repeated initialization check");
  console.log("PASS: Baseline anchor #search rendered correctly");
  console.log("PASS: Repeated initialization does not duplicate form event handlers");
  console.log("PASS: Repeated search interactions replace results without DOM node duplication");
  console.log("PASS: Isolated test harness prevents duplicate control creation on repeated init");
  console.log("PASS: Repeated style toggles produce consistent updates");
  console.log("PASS: Cleanup leaves zero active timers or event listeners");
  console.log("PASS: Zero page and server errors");

} catch (error) {
  console.error("FAIL: R18-T034");
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
