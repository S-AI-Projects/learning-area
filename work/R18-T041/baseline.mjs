import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve } from "node:path";

const root = process.cwd();
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    const file = resolve(root, `.${decodeURIComponent(url.pathname)}`);

    if (!file.startsWith(root + "/")) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    const data = await readFile(file);
    const types = {
      ".html": "text/html",
      ".webm": "video/webm",
      ".mp4": "video/mp4",
    };

    res.writeHead(200, {
      "Content-Type": types[extname(file)] || "application/octet-stream",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(data);
  } catch {
    res.writeHead(404).end("Not found");
  }
});

let browser;

try {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  browser = await chromium.launch({ headless: true });

  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(
    `http://127.0.0.1:${address.port}/html/multimedia-and-embedding/video-and-audio-content/simple-video.html`
  );

  await page.locator("video").waitFor();

  await page.waitForFunction(() => {
    const video = document.querySelector("video");
    return video && video.readyState >= 1;
  }, { timeout: 15000 });

  console.log("VIDEO:", await page.locator("video").evaluate((video) => ({
    controls: video.controls,
    source: video.currentSrc,
    readyState: video.readyState,
    duration: video.duration,
    width: video.videoWidth,
    height: video.videoHeight,
    paused: video.paused,
  })));

  await page.keyboard.press("Tab");

  console.log("AFTER TAB:", await page.evaluate(() => ({
    activeElement: document.activeElement?.tagName,
    videoFocused: document.activeElement === document.querySelector("video"),
    focusVisible: document.querySelector("video")?.matches(":focus-visible"),
  })));

  const video = page.locator("video");
  await video.focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(500);

  console.log("AFTER SPACE:", await video.evaluate((element) => ({
    paused: element.paused,
    currentTime: element.currentTime,
  })));

  await context.close();
} catch (error) {
  console.error("BASELINE INSPECTION FAILED:", error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
