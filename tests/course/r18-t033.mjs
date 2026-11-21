import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { chromium } from "playwright";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const playwrightVersion = require("playwright/package.json").version;

const taskId = "R18-T033";
const root = process.cwd();
const target = "/accessibility/multimedia/audio-transcript-ui/index.html";
const emptyFixture = "/accessibility/multimedia/audio-transcript-ui/fixtures/audio-transcript-empty.html";
const evidenceDir = resolve(root, `work/${taskId}`);

await mkdir(evidenceDir, { recursive: true });

let server;
let browser;
const serverErrors = [];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg",
  ".png": "image/png"
};

const evidence = {
  task: taskId,
  input: {
    target,
    emptyFixture,
    viewport: { width: 1280, height: 800 }
  },
  expected: {
    baselinePlayerControls: true,
    transcriptToggle: true,
    failedAssetFallbackDisplayed: true,
    failedAssetControlsDisabled: true,
    restoredAssetRecovery: true,
    emptyFixtureDisplaysReadableState: true,
    noUncaughtPageErrors: true,
    serverErrors: 0
  },
  actual: {},
  tools: {
    node: process.version,
    playwright: playwrightVersion
  }
};

try {
  // Start ephemeral static HTTP server
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

  // Verify server readiness probe
  const probeResponse = await fetch(`${baseUrl}${target}`);
  assert.equal(probeResponse.status, 200, "Server readiness probe must return 200");

  browser = await chromium.launch({ headless: true });
  evidence.tools.chromium = browser.version();

  // ========================================================
  // Scenario 1: Baseline Normal Media & Transcript Behavior
  // ========================================================
  console.log("\n--- Scenario 1: Baseline Normal Media & Transcript ---");
  const context1 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pageErrors1 = [];
  const page1 = await context1.newPage();
  page1.on("pageerror", err => pageErrors1.push(err.message));

  await page1.goto(`${baseUrl}${target}`, { waitUntil: "networkidle" });
  assert.equal(await page1.title(), "Audio transcript example");

  // Check audio element, sources, and fallback link
  const audioLocator = page1.locator("audio");
  assert.equal(await audioLocator.count(), 1, "Audio element must exist");
  const fallbackLink = page1.locator("audio a");
  assert.equal(await fallbackLink.count(), 1, "Audio fallback anchor must exist");
  assert.match(await fallbackLink.getAttribute("href"), /viper\.mp3$/, "Fallback link must point to audio file");

  // Custom buttons
  const playBtn = page1.locator(".playpause");
  const stopBtn = page1.locator(".stop");
  assert.equal(await playBtn.isEnabled(), true, "Play button must be enabled initially");
  assert.equal(await stopBtn.isEnabled(), true, "Stop button must be enabled initially");

  // Audio fallback banner should be hidden initially
  const fallbackBanner = page1.locator(".audio-fallback");
  assert.equal(await fallbackBanner.isVisible(), false, "Audio fallback banner must be hidden when asset loads successfully");

  // Transcript disclosure test
  const transcriptSection = page1.locator(".transcript");
  const transcriptBtn = page1.locator(".transcript-container button");
  assert.equal((await transcriptSection.evaluate(el => el.clientHeight)), 0, "Transcript must be collapsed initially");
  assert.equal((await transcriptBtn.textContent()).trim(), "Show transcript");

  await transcriptBtn.click();
  await page1.waitForFunction(() => document.querySelector(".transcript").clientHeight > 50);
  assert.equal(await transcriptSection.evaluate(el => el.clientHeight), 150, "Transcript must expand to 150px");
  assert.equal((await transcriptBtn.textContent()).trim(), "Hide transcript");

  await transcriptBtn.click();
  await page1.waitForFunction(() => document.querySelector(".transcript").clientHeight === 0);
  assert.equal(await transcriptSection.evaluate(el => el.clientHeight), 0, "Transcript must collapse back to 0px");
  assert.equal((await transcriptBtn.textContent()).trim(), "Show transcript");

  await page1.screenshot({ path: resolve(evidenceDir, "baseline-normal.png") });
  assert.deepEqual(pageErrors1, [], "Zero page errors in baseline scenario");
  await context1.close();

  // ========================================================
  // Scenario 2: Failed Asset with Readable Fallback
  // ========================================================
  console.log("\n--- Scenario 2: Failed Audio Asset Handling ---");
  const context2 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pageErrors2 = [];
  const page2 = await context2.newPage();
  page2.on("pageerror", err => pageErrors2.push(err.message));

  // Intercept and abort audio requests to simulate failed asset
  await page2.route("**/*.{mp3,ogg}", route => route.abort());

  await page2.goto(`${baseUrl}${target}`, { waitUntil: "domcontentloaded" });

  // Trigger error check by interacting with player or waiting for error event
  await page2.evaluate(() => {
    const audio = document.querySelector("audio");
    if (audio) {
      audio.dispatchEvent(new Event("error"));
      const sources = audio.querySelectorAll("source");
      sources.forEach(s => s.dispatchEvent(new Event("error")));
    }
  });

  // Verify readable fallback state is displayed
  const errorBanner = page2.locator(".audio-fallback");
  await page2.waitForFunction(() => {
    const el = document.querySelector(".audio-fallback");
    return el && window.getComputedStyle(el).display !== "none";
  });
  assert.equal(await errorBanner.isVisible(), true, "Fallback banner must be visible on failed audio asset");

  const fallbackText = await errorBanner.innerText();
  assert.match(fallbackText, /Audio failed to load/i, "Fallback must display readable message");
  const retryLink = errorBanner.locator("a");
  assert.equal(await retryLink.count(), 1, "Fallback must include a direct link");

  // Controls must enter disabled state and not throw when clicked
  assert.equal(await page2.locator(".playpause").isDisabled(), true, "Play button must be disabled when audio fails");
  await page2.locator(".playpause").click({ force: true });
  assert.deepEqual(pageErrors2, [], "No uncaught errors thrown when clicking controls during error state");

  await page2.screenshot({ path: resolve(evidenceDir, "failed-asset-fallback.png") });

  // ========================================================
  // Scenario 3: Recovery After Restored Asset
  // ========================================================
  console.log("\n--- Scenario 3: Asset Recovery ---");
  // Unroute audio requests so valid audio can load
  await page2.unroute("**/*.{mp3,ogg}");

  // Simulate asset recovery
  await page2.evaluate(() => {
    const audio = document.querySelector("audio");
    if (audio) {
      audio.dispatchEvent(new Event("canplay"));
    }
  });

  await page2.waitForFunction(() => {
    const el = document.querySelector(".audio-fallback");
    return el && window.getComputedStyle(el).display === "none";
  });
  assert.equal(await errorBanner.isVisible(), false, "Fallback banner must hide after asset recovers");
  assert.equal(await page2.locator(".playpause").isEnabled(), true, "Play button must re-enable upon recovery");

  await page2.screenshot({ path: resolve(evidenceDir, "recovered-asset.png") });
  assert.deepEqual(pageErrors2, [], "Zero page errors in failed/recovered asset scenario");
  await context2.close();

  // ========================================================
  // Scenario 4: Static Empty Result Fixture Verification
  // ========================================================
  console.log("\n--- Scenario 4: Static Empty Result Fixture ---");
  const context3 = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const pageErrors3 = [];
  const page3 = await context3.newPage();
  page3.on("pageerror", err => pageErrors3.push(err.message));

  await page3.goto(`${baseUrl}${emptyFixture}`, { waitUntil: "domcontentloaded" });
  assert.match(await page3.title(), /Empty Result Fixture/i, "Fixture title must indicate empty result");

  // Open transcript and verify readable empty state
  const fixtureTranscriptBtn = page3.locator(".transcript-container button");
  await fixtureTranscriptBtn.click();
  await page3.waitForFunction(() => document.querySelector(".transcript").clientHeight > 50);

  const emptyMsg = page3.locator(".empty-transcript");
  assert.equal(await emptyMsg.isVisible(), true, "Empty transcript message must be visible in empty fixture");
  assert.equal((await emptyMsg.textContent()).trim(), "No transcript is available for this recording.");

  await page3.screenshot({ path: resolve(evidenceDir, "empty-fixture.png") });
  assert.deepEqual(pageErrors3, [], "Zero page errors in empty fixture scenario");
  await context3.close();

  // Record all actual outcomes
  assert.deepEqual(serverErrors, [], "Zero server errors");
  evidence.actual = {
    baselinePlayerControls: true,
    transcriptToggle: true,
    failedAssetFallbackDisplayed: true,
    failedAssetControlsDisabled: true,
    restoredAssetRecovery: true,
    emptyFixtureDisplaysReadableState: true,
    noUncaughtPageErrors: true,
    serverErrors: 0
  };

  console.log("\nPASS: R18-T033 Audio transcript UI checks");
  console.log("PASS: Baseline controls and transcript toggle verified");
  console.log("PASS: Failed asset displays readable fallback banner with link");
  console.log("PASS: Controls disable gracefully without throwing uncaught errors");
  console.log("PASS: Asset restoration recovers player state cleanly");
  console.log("PASS: Static empty result fixture displays readable fallback");
  console.log("PASS: Zero page and server errors");

} catch (error) {
  console.error("FAIL: R18-T033");
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
