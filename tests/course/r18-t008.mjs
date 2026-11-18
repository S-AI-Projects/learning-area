import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const htmlPath = path.join(root, "css/web-fonts/text-rendering.html");
const evidenceDir = path.join(root, "work/R18-T008");
const payload = '<img src=x onerror="alert(1)">';

let server;
let browser;
let pageErrors = [];
let dialogCount = 0;

try {
  assert.ok(fs.existsSync(htmlPath), "Companion example must exist");

  server = http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    const filePath = path.resolve(root, `.${pathname}`);

    if (!filePath.startsWith(root + path.sep) || !fs.existsSync(filePath)) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const contentTypes = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
    };

    res.writeHead(200, {
      "Content-Type": contentTypes[path.extname(filePath)] || "application/octet-stream",
    });
    fs.createReadStream(filePath).pipe(res);
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  assert.ok(address && typeof address === "object");

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  pageErrors = [];

  const page = await context.newPage();
  page.on("pageerror", error => pageErrors.push(error.message));
  page.on("dialog", async dialog => {
    dialogCount++;
    await dialog.dismiss();
  });

  const response = await page.goto(
    `http://127.0.0.1:${address.port}/css/web-fonts/text-rendering.html`,
    { waitUntil: "load" }
  );
  assert.equal(response.status(), 200, "Example page should load successfully");

  await page.locator("#user-text").fill(payload);
  await page.locator("#show-text").click();

  const output = page.locator("#output");
  assert.equal(await output.textContent(), payload, "Input must appear as literal text");
  assert.equal(await output.locator("img").count(), 0, "Input must not create an image element");
  assert.equal(await page.locator("img").count(), 0, "Page must contain no injected image");
  assert.equal(dialogCount, 0, "Input must not execute an alert handler");

  const layout = await output.evaluate(element => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return {
      display: style.display,
      visible: rect.width > 0 && rect.height > 0,
      text: element.textContent,
    };
  });

  assert.equal(layout.display, "block", "Output should retain its normal block layout");
  assert.equal(layout.visible, true, "Output should be visible");
  assert.deepEqual(pageErrors, [], "Page must not produce unexpected JavaScript errors");

  const browserVersion = browser.version();
  const evidence = [
    "R18-T008 regression test",
    `Node: ${process.version}`,
    `Playwright: ${JSON.parse(fs.readFileSync(path.join(root, "tests/course/node_modules/playwright/package.json"), "utf8")).version}`,
    `Chromium: ${browserVersion}`,
    `Input: ${payload}`,
    `Expected: literal text, no img element, no alert, visible block output`,
    `Actual: ${JSON.stringify(layout)}`,
    `Injected image count: ${await page.locator("img").count()}`,
    `Alert count: ${dialogCount}`,
    `Page errors: ${JSON.stringify(pageErrors)}`,
    "Result: PASS",
    "",
  ].join("\n");

  fs.writeFileSync(path.join(evidenceDir, "after.txt"), evidence);
  await context.close();

  console.log(evidence);
} catch (error) {
  console.error("R18-T008 FAILED:", error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
