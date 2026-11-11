import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const evidenceDir = path.join(root, "work/R18-T046");
const pagePath = "/javascript/apis/introduction/bouncing-balls.html";
const viewport = { width: 960, height: 640 };

await mkdir(evidenceDir, { recursive: true });

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname,
    );
    const filePath = path.resolve(root, `.${pathname}`);

    if (!filePath.startsWith(`${root}${path.sep}`)) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    const content = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] ?? "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(content);
  } catch {
    response.writeHead(404).end("Not found");
  }
});

let browser;

const actual = [];
const pageErrors = [];
const failedRequests = [];

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  assert.ok(address && typeof address === "object");
  const baseUrl = `http://127.0.0.1:${address.port}`;

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    failedRequests.push(`${request.url()}: ${request.failure()?.errorText}`);
  });

  // Make ball creation repeatable and let the test advance animation frames.
  await page.addInitScript(() => {
    let seed = 123456789;
    Math.random = () => {
      seed = (1664525 * seed + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    window.__task6FrameQueue = [];
    window.requestAnimationFrame = (callback) => {
      window.__task6FrameQueue.push(callback);
      return window.__task6FrameQueue.length;
    };

    window.__task6ArcCalls = 0;
    const originalArc = CanvasRenderingContext2D.prototype.arc;
    CanvasRenderingContext2D.prototype.arc = function (...args) {
      window.__task6ArcCalls += 1;
      return originalArc.apply(this, args);
    };
  });

  const response = await page.goto(`${baseUrl}${pagePath}`, {
    waitUntil: "load",
  });

  assert.equal(response?.status(), 200, "The example page should load successfully");
  actual.push(`HTTP response: ${response.status()}`);

  assert.equal(await page.title(), "Bouncing balls");
  assert.equal(await page.locator("h1").textContent(), "bouncing balls");
  actual.push("Document title and heading: correct");

  const layout = await page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const heading = document.querySelector("h1");
    const bodyStyle = getComputedStyle(document.body);
    const headingStyle = getComputedStyle(heading);

    return {
      canvasPresent: Boolean(canvas),
      canvasWidth: canvas?.width,
      canvasHeight: canvas?.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      bodyOverflow: bodyStyle.overflow,
      headingPosition: headingStyle.position,
    };
  });

  assert.equal(layout.canvasPresent, true, "The page should contain a canvas");
  assert.equal(layout.canvasWidth, viewport.width);
  assert.equal(layout.canvasHeight, viewport.height);
  assert.equal(layout.viewportWidth, viewport.width);
  assert.equal(layout.viewportHeight, viewport.height);
  assert.equal(layout.bodyOverflow, "hidden");
  assert.equal(layout.headingPosition, "absolute");
  actual.push(`Canvas layout: ${layout.canvasWidth}x${layout.canvasHeight}`);
  actual.push(`Body overflow: ${layout.bodyOverflow}`);
  actual.push(`Heading position: ${layout.headingPosition}`);

  const firstFrame = await page.evaluate(() => ({
    arcCalls: window.__task6ArcCalls,
    pendingFrames: window.__task6FrameQueue.length,
    image: document.querySelector("canvas").toDataURL(),
  }));

  assert.equal(firstFrame.arcCalls, 25, "The first frame should draw 25 balls");
  assert.equal(firstFrame.pendingFrames, 1, "The animation should schedule its next frame");
  actual.push(`Initial frame: ${firstFrame.arcCalls} balls drawn`);
  await page.screenshot({
    path: path.join(evidenceDir, "initial-frame.png"),
    fullPage: false,
  });

  await page.evaluate(() => {
    const nextFrame = window.__task6FrameQueue.shift();
    if (!nextFrame) throw new Error("No animation frame was scheduled");
    nextFrame(16);
  });

  const secondFrame = await page.evaluate(() => ({
    arcCalls: window.__task6ArcCalls,
    pendingFrames: window.__task6FrameQueue.length,
    image: document.querySelector("canvas").toDataURL(),
  }));

  assert.equal(secondFrame.arcCalls, 50, "The second frame should draw 25 more balls");
  assert.equal(secondFrame.pendingFrames, 1, "The animation should schedule another frame");
  assert.notEqual(
    secondFrame.image,
    firstFrame.image,
    "The canvas image should change after the next animation frame",
  );
  actual.push(`Second frame: ${secondFrame.arcCalls - firstFrame.arcCalls} additional ball draws`);
  actual.push("Canvas image changed between frames: yes");

  await page.screenshot({
    path: path.join(evidenceDir, "second-frame.png"),
    fullPage: false,
  });

  assert.deepEqual(pageErrors, [], "The page should not produce uncaught JavaScript errors");
  assert.deepEqual(failedRequests, [], "The page should not have failed network requests");
  actual.push("Uncaught page errors: none");
  actual.push("Failed requests: none");

  await context.close();

  const inputs = [
    `Entry point: ${pagePath}`,
    `Viewport: ${viewport.width}x${viewport.height}`,
    "Browser context: fresh, headless Chromium",
    "Randomness: seeded in the test before page scripts execute",
    "Animation frames: manually advanced by the test",
  ].join("\n");

  const expected = [
    "HTTP 200; title Bouncing balls; heading bouncing balls",
    `Canvas intrinsic dimensions equal viewport (${viewport.width}x${viewport.height})`,
    "Body overflow hidden; heading position absolute",
    "First animation frame draws 25 balls and schedules one next frame",
    "Second animation frame draws 25 additional balls and changes canvas pixels",
    "No uncaught page errors or failed requests",
  ].join("\n");

  await writeFile(path.join(evidenceDir, "inputs.txt"), `${inputs}\n`);
  await writeFile(path.join(evidenceDir, "expected-results.txt"), `${expected}\n`);
  await writeFile(path.join(evidenceDir, "actual-results.txt"), `${actual.join("\n")}\n`);

  console.log("R18-T046: PASS");
  console.log(actual.join("\n"));
  console.log(`Evidence: ${evidenceDir}`);
} catch (error) {
  await writeFile(
    path.join(evidenceDir, "actual-results.txt"),
    `${actual.join("\n")}\nFAIL: ${error.stack ?? error.message}\n`,
  ).catch(() => {});
  console.error("R18-T046: FAIL");
  console.error(error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server.listening) {
    await new Promise((resolve) => server.close(resolve));
  }
}
