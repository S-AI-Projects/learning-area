import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const targetPage = "javascript/apis/video-audio/start/index.html";
const emptyFixture = "javascript/apis/video-audio/start/fixtures/video-empty.html";
const evidenceDir = path.join(root, "work/R18-T053");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject"
};

let server;
let browser;

const serverFactory = () => {
  return http.createServer((req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      const relativePath = decodeURIComponent(url.pathname).replace(/^\//, "");
      const filePath = path.resolve(root, relativePath);

      if (!filePath.startsWith(root + path.sep)) {
        res.writeHead(403);
        return res.end("Forbidden");
      }

      if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        return res.end("Not found");
      }

      const ext = path.extname(filePath);
      const stat = fs.statSync(filePath);
      const range = req.headers.range;

      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        const chunksize = end - start + 1;
        const stream = fs.createReadStream(filePath, { start, end });
        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": mimeTypes[ext] || "application/octet-stream"
        });
        return stream.pipe(res);
      }

      res.writeHead(200, {
        "Content-Length": stat.size,
        "Accept-Ranges": "bytes",
        "Content-Type": mimeTypes[ext] || "application/octet-stream"
      });
      fs.createReadStream(filePath).pipe(res);
    } catch {
      res.writeHead(500);
      res.end("Internal Server Error");
    }
  });
};

async function main() {
  fs.mkdirSync(evidenceDir, { recursive: true });

  server = serverFactory();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const port = server.address().port;
  browser = await chromium.launch({ headless: true });

  // -------------------------------------------------------------
  // Scenario 1: Baseline Normal Loading & Custom Controls
  // -------------------------------------------------------------
  console.log("\n--- Scenario 1: Baseline Normal Loading ---");
  {
    const errors = [];
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on("pageerror", err => errors.push(err.message));
    page.on("console", msg => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    page.on("requestfailed", req => {
      const errText = req.failure()?.errorText || "";
      if (errText !== "net::ERR_ABORTED") {
        errors.push(`Request failed: ${req.url()} (${errText})`);
      }
    });

    const resp = await page.goto(`http://127.0.0.1:${port}/${targetPage}`, {
      waitUntil: "networkidle"
    });
    assert.equal(resp.status(), 200, "Page should load with HTTP 200");

    // Video anchor
    const video = page.locator("video");
    assert.equal(await video.count(), 1, "<video> anchor must exist");

    // Controls and Buttons anchors
    const controls = page.locator(".controls");
    assert.equal(await controls.count(), 1, ".controls element must exist");
    const isControlsVisible = await controls.evaluate(el => window.getComputedStyle(el).visibility === "visible");
    assert.equal(isControlsVisible, true, "Custom controls should be visible when player script initializes");

    const playBtn = page.locator("button.play");
    const stopBtn = page.locator("button.stop");
    const rwdBtn = page.locator("button.rwd");
    const fwdBtn = page.locator("button.fwd");

    assert.equal(await playBtn.count(), 1, "Play button must exist");
    assert.equal(await stopBtn.count(), 1, "Stop button must exist");
    assert.equal(await rwdBtn.count(), 1, "Rewind button must exist");
    assert.equal(await fwdBtn.count(), 1, "Fast forward button must exist");

    // Anchor link (a)
    const attributionLink = page.locator('p a[href="https://studio.blender.org/films/sintel/"]');
    assert.equal(await attributionLink.count(), 1, "Attribution <a> anchor must exist");

    // Error banner should be hidden initially
    const errorBanner = page.locator(".media-error-msg");
    assert.equal(await errorBanner.isVisible(), false, "Error banner should be hidden during normal playback");

    // Interactive playback check
    await playBtn.click();
    assert.equal(await playBtn.getAttribute("data-icon"), "u", "Play button should toggle to pause icon (u)");

    await stopBtn.click();
    assert.equal(await playBtn.getAttribute("data-icon"), "P", "Stop button should reset play button icon to P");

    await page.screenshot({
      path: path.join(evidenceDir, "baseline-normal.png"),
      fullPage: true
    });

    assert.deepEqual(errors, [], "No unexpected errors in baseline normal scenario");
    console.log("PASS: Baseline normal playback, controls, and anchors verified");
    await context.close();
  }

  // -------------------------------------------------------------
  // Scenario 2: Failed Asset / Media Error State
  // -------------------------------------------------------------
  console.log("\n--- Scenario 2: Failed Asset / Media Error Fallback ---");
  {
    const errors = [];
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on("pageerror", err => errors.push(err.message));
    page.on("console", msg => {
      // 404 console errors for deliberately failed media assets are expected
      if (msg.type() === "error" && !msg.text().includes("404") && !msg.text().includes("Failed to load resource")) {
        errors.push(msg.text());
      }
    });

    // Intercept media requests to simulate asset failure
    await page.route("**/*.{mp4,webm}*", route => {
      route.fulfill({ status: 404, contentType: "text/plain", body: "Media not found" });
    });

    await page.goto(`http://127.0.0.1:${port}/${targetPage}`);

    // Wait for error state to be reflected in DOM
    const errorBanner = page.locator(".media-error-msg");
    await page.waitForFunction(() => {
      const banner = document.querySelector(".media-error-msg");
      return banner && window.getComputedStyle(banner).display !== "none";
    }, { timeout: 10000 });

    assert.equal(await errorBanner.isVisible(), true, "Fallback error banner must be visible when media fails");

    // Check direct fallback link inside error message
    const directLink = errorBanner.locator("a");
    assert.equal(await directLink.count(), 1, "Direct video link must exist in error message");
    assert.ok(
      (await directLink.getAttribute("href")).includes("video/sintel-short.mp4"),
      "Fallback link must point to the media asset"
    );

    // Verify control buttons are safely disabled
    const playBtn = page.locator("button.play");
    const stopBtn = page.locator("button.stop");
    assert.equal(await playBtn.isDisabled(), true, "Play button must be disabled on media error");
    assert.equal(await stopBtn.isDisabled(), true, "Stop button must be disabled on media error");

    // Verify clicking disabled button does not throw
    await playBtn.click({ force: true });
    await stopBtn.click({ force: true });

    await page.screenshot({
      path: path.join(evidenceDir, "failed-asset-fallback.png"),
      fullPage: true
    });

    assert.deepEqual(errors, [], "No uncaught exceptions logged during failed asset scenario");
    console.log("PASS: Meaningful fallback state displayed and controls safely disabled");
    await context.close();
  }

  // -------------------------------------------------------------
  // Scenario 3: Media Recovery After Valid Input / Restored Asset
  // -------------------------------------------------------------
  console.log("\n--- Scenario 3: Media Recovery After Asset Restoration ---");
  {
    const errors = [];
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on("pageerror", err => errors.push(err.message));
    page.on("console", msg => {
      if (msg.type() === "error" && !msg.text().includes("404") && !msg.text().includes("Failed to load resource")) {
        errors.push(msg.text());
      }
    });

    // Start with failed state
    await page.route("**/*.{mp4,webm}*", route => {
      route.fulfill({ status: 404, contentType: "text/plain", body: "Media not found" });
    });

    await page.goto(`http://127.0.0.1:${port}/${targetPage}`);

    const errorBanner = page.locator(".media-error-msg");
    await page.waitForFunction(() => {
      const banner = document.querySelector(".media-error-msg");
      return banner && window.getComputedStyle(banner).display !== "none";
    });

    assert.equal(await errorBanner.isVisible(), true, "Initially in error state");

    // Unroute media to allow legitimate requests and restore media source
    await page.unroute("**/*.{mp4,webm}*");

    await page.evaluate(validSrc => {
      const video = document.querySelector("video");
      video.src = validSrc;
      video.load();
    }, `http://127.0.0.1:${port}/javascript/apis/video-audio/start/video/sintel-short.mp4`);

    // Wait for recovery
    await page.waitForFunction(() => {
      const banner = document.querySelector(".media-error-msg");
      const play = document.querySelector("button.play");
      return banner && window.getComputedStyle(banner).display === "none" && play && !play.disabled;
    }, { timeout: 10000 });

    assert.equal(await errorBanner.isVisible(), false, "Error banner must hide after valid media is restored");

    const playBtn = page.locator("button.play");
    assert.equal(await playBtn.isDisabled(), false, "Play button must be re-enabled after recovery");

    await playBtn.click();
    assert.equal(await playBtn.getAttribute("data-icon"), "u", "Player should resume normal play/pause functionality");

    await page.screenshot({
      path: path.join(evidenceDir, "recovered-asset.png"),
      fullPage: true
    });

    assert.deepEqual(errors, [], "No uncaught errors during recovery");
    console.log("PASS: Player successfully recovers and resumes operation upon asset restoration");
    await context.close();
  }

  // -------------------------------------------------------------
  // Scenario 4: Static Empty Result Fixture
  // -------------------------------------------------------------
  console.log("\n--- Scenario 4: Static Empty Result Fixture ---");
  {
    const errors = [];
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on("pageerror", err => errors.push(err.message));
    page.on("console", msg => {
      if (msg.type() === "error") errors.push(msg.text());
    });

    const resp = await page.goto(`http://127.0.0.1:${port}/${emptyFixture}`, {
      waitUntil: "networkidle"
    });
    assert.equal(resp.status(), 200, "Empty fixture should load with HTTP 200");

    const errorBanner = page.locator(".media-error-msg");
    assert.equal(await errorBanner.isVisible(), true, "Empty fixture must display status alert");
    const bannerText = await errorBanner.innerText();
    assert.ok(bannerText.includes("No video source specified"), "Empty fixture must state no video specified");

    const playBtn = page.locator("button.play");
    assert.equal(await playBtn.isDisabled(), true, "Buttons must be disabled on empty fixture");

    await page.screenshot({
      path: path.join(evidenceDir, "empty-fixture.png"),
      fullPage: true
    });

    assert.deepEqual(errors, [], "No unexpected errors on static empty fixture");
    console.log("PASS: Static empty fixture validated");
    await context.close();
  }

  // -------------------------------------------------------------
  // Scenario 5: Missing Icon Font Fallback Legibility
  // -------------------------------------------------------------
  console.log("\n--- Scenario 5: Missing Icon Font Fallback ---");
  {
    const errors = [];
    const context = await browser.newContext();
    const page = await context.newPage();
    page.on("pageerror", err => errors.push(err.message));
    page.on("console", msg => {
      if (msg.type() === "error" && !msg.text().includes("404")) {
        errors.push(msg.text());
      }
    });

    await page.route("**/*.{woff,ttf,eot}*", route => {
      route.fulfill({ status: 404, contentType: "text/plain", body: "Font not found" });
    });

    await page.goto(`http://127.0.0.1:${port}/${targetPage}`, {
      waitUntil: "networkidle"
    });

    // Check button fallback typography
    const playBtn = page.locator("button.play");
    const label = await playBtn.getAttribute("aria-label");
    assert.equal(label, "play pause toggle", "Button must retain accessible aria-label");

    const dataIcon = await playBtn.getAttribute("data-icon");
    assert.equal(dataIcon, "P", "Button must provide fallback icon character");

    assert.deepEqual(errors, [], "No uncaught errors on font fallback");
    console.log("PASS: Font fallback legibility and accessibility verified");
    await context.close();
  }

  console.log("\nAll R18-T053 checks passed successfully.");
}

main().catch(err => {
  console.error("\nR18-T053 FAILED:", err);
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
  if (server?.listening) {
    await new Promise(r => server.close(r));
  }
});
