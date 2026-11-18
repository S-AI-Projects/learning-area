import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const target = "/javascript/apis/video-audio/start/index.html";
const errors = [];

const mimeTypes = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".eot": "application/vnd.ms-fontobject",
};

const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  const file = path.resolve(root, `.${pathname}`);

  if (!file.startsWith(`${root}${path.sep}`)) {
    res.writeHead(403).end();
    return;
  }

  fs.readFile(file, (error, data) => {
    if (error) {
      res.writeHead(404).end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(file)] || "application/octet-stream",
    });
    res.end(data);
  });
});

async function main() {
  let browser;

  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(0, "127.0.0.1", resolve);
    });

    const url = `http://127.0.0.1:${server.address().port}${target}`;
    browser = await chromium.launch({ headless: true });

    // Feature-present path: provide deterministic media methods.
    const supportedContext = await browser.newContext();
    await supportedContext.addInitScript(() => {
      let paused = true;

      Object.defineProperty(HTMLMediaElement.prototype, "paused", {
        configurable: true,
        get: () => paused,
      });

      HTMLMediaElement.prototype.play = function () {
        paused = false;
        return Promise.resolve();
      };

      HTMLMediaElement.prototype.pause = function () {
        paused = true;
      };
    });

    const supportedPage = await supportedContext.newPage();
    supportedPage.on("pageerror", error => errors.push(error.message));

    const supportedResponse = await supportedPage.goto(url);
    assert.equal(supportedResponse.status(), 200);
    await supportedPage.locator(".controls").waitFor();

    assert.equal(await supportedPage.locator("video").count(), 1);
    assert.equal(
      await supportedPage.locator("video").evaluate(video => video.hasAttribute("controls")),
      false,
      "Custom player should replace native controls when supported."
    );
    assert.equal(
      await supportedPage.locator(".controls").evaluate(el => getComputedStyle(el).visibility),
      "visible"
    );
    assert.equal(await supportedPage.locator(".media-fallback").count(), 0);
    assert.equal(
      await supportedPage.locator(".controls button").count(),
      4
    );

    await supportedPage.locator(".play").click();
    assert.equal(
      await supportedPage.locator(".play").getAttribute("data-icon"),
      "u"
    );

    await supportedPage.locator(".stop").click();
    assert.equal(
      await supportedPage.locator(".play").getAttribute("data-icon"),
      "P"
    );
    assert.equal(
      await supportedPage.locator("video").evaluate(video => video.paused),
      true
    );

    const controlLayout = await supportedPage.locator(".controls").evaluate(el => {
      const style = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return {
        display: style.display,
        width: Math.round(rect.width),
        buttonCount: el.querySelectorAll("button").length,
      };
    });

    assert.equal(controlLayout.display, "flex");
    assert.equal(controlLayout.width, 400);
    assert.equal(controlLayout.buttonCount, 4);

    console.log("PASS: Supported media API initializes the custom controls.");
    console.log("PASS: Play and stop controls update their expected state.");
    console.log("PASS: Custom controls have the expected layout.");

    // Feature-absent path: simulate a browser without media methods.
    const unsupportedContext = await browser.newContext();
    await unsupportedContext.addInitScript(() => {
      HTMLMediaElement.prototype.play = undefined;
      HTMLMediaElement.prototype.pause = undefined;
    });

    const unsupportedPage = await unsupportedContext.newPage();
    unsupportedPage.on("pageerror", error => errors.push(error.message));

    const unsupportedResponse = await unsupportedPage.goto(url);
    assert.equal(unsupportedResponse.status(), 200);

    assert.equal(
      await unsupportedPage.locator("video").evaluate(video => video.hasAttribute("controls")),
      true,
      "Native controls should remain available in the unsupported path."
    );
    assert.equal(
      await unsupportedPage.locator(".controls").evaluate(el => getComputedStyle(el).visibility),
      "hidden"
    );
    assert.match(
      await unsupportedPage.locator(".media-fallback").textContent(),
      /does not support the video playback features required by this custom player/i
    );

    console.log("PASS: Unsupported media API displays an explicit fallback.");
    console.log("PASS: Native controls remain enabled in the unsupported path.");

    assert.deepEqual(errors, [], "Unexpected browser page errors were recorded.");
    console.log("PASS: No unexpected browser page errors.");

    await supportedContext.close();
    await unsupportedContext.close();
  } finally {
    if (browser) await browser.close();
    if (server.listening) {
      await new Promise(resolve => server.close(resolve));
    }
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
