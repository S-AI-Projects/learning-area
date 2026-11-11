import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const examplePath =
  "/html/multimedia-and-embedding/video-and-audio-content/simple-video.html";

const server = createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname
    );
    const file = resolve(root, `.${pathname}`);

    if (!file.startsWith(`${root}/`)) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    const data = await readFile(file);
    const types = {
      ".html": "text/html; charset=utf-8",
      ".webm": "video/webm",
      ".mp4": "video/mp4",
    };

    res.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
    });
    res.end(data);
  } catch {
    res.writeHead(404).end("Not found");
  }
});

let browser;
let serverStarted = false;

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  serverStarted = true;

  const address = server.address();
  const baseURL = `http://127.0.0.1:${address.port}`;

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const response = await page.goto(`${baseURL}${examplePath}`);
  assert.equal(response.status(), 200, "Example page should load");

  const heading = page.getByRole("heading", {
    name: "Below is a simple video example",
    level: 1,
  });
  await heading.waitFor();

  const video = page.locator("video");
  await video.waitFor();

  assert.equal(
    await video.getAttribute("controls") !== null,
    true,
    "Video must expose native controls"
  );

  await page.waitForFunction(() => {
    const element = document.querySelector("video");
    return element && element.readyState >= 1;
  }, { timeout: 15000 });

  const media = await video.evaluate((element) => ({
    readyState: element.readyState,
    duration: element.duration,
    width: element.videoWidth,
    height: element.videoHeight,
    paused: element.paused,
  }));

  assert.ok(media.readyState >= 1, "Video metadata should load");
  assert.ok(Number.isFinite(media.duration), "Video duration should be known");
  assert.ok(
    media.width > 0 && media.height > 0,
    "Video dimensions should be valid"
  );

  const positiveTabIndex = await page.locator("[tabindex]").evaluateAll(
    (elements) =>
      elements.filter(
        (element) => Number(element.getAttribute("tabindex")) > 0
      ).length
  );

  assert.equal(
    positiveTabIndex,
    0,
    "Page should not use positive tabindex values"
  );

  await page.keyboard.press("Tab");

  const focus = await page.evaluate(() => {
    const element = document.querySelector("video");
    return {
      videoFocused: document.activeElement === element,
      focusVisible: element.matches(":focus-visible"),
    };
  });

  assert.equal(focus.videoFocused, true, "Tab should reach the video");
  assert.equal(focus.focusVisible, true, "Keyboard focus should be visible");

  // Space starts playback.
  await page.keyboard.press("Space");

  await page.waitForFunction(
    () => {
      const element = document.querySelector("video");
      return !element.paused && element.currentTime > 0;
    },
    { timeout: 5000 }
  );

  // Space pauses playback.
  await page.keyboard.press("Space");

  await page.waitForFunction(
    () => document.querySelector("video").paused,
    { timeout: 5000 }
  );

  assert.equal(
    await video.evaluate((element) => element.paused),
    true,
    "Space should pause playback"
  );

  assert.deepEqual(
    pageErrors,
    [],
    "Page should not produce JavaScript errors"
  );

  console.log("PASS: Page and heading load");
  console.log("PASS: Native video controls are enabled");
  console.log("PASS: Video metadata and dimensions load", media);
  console.log("PASS: No positive tabindex values");
  console.log("PASS: Tab reaches the video element");
  console.log("PASS: Keyboard focus is visible");
  console.log("PASS: Space starts video playback");
  console.log("PASS: Space pauses video playback");
  console.log("PASS: No unexpected page errors");
} catch (error) {
  console.error("FAIL: R18-T041", error);
  process.exitCode = 1;
} finally {
  try {
    if (browser) {
      await browser.close();
    }
  } finally {
    if (serverStarted) {
      await new Promise((resolve, reject) =>
        server.close((error) => (error ? reject(error) : resolve()))
      );
    }
  }
}
