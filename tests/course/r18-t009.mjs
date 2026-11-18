import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const target = "/javascript/asynchronous/sequencing-animations/start/";
const errors = [];
let browser;
let server;

const mimeTypes = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml"
};

try {
  server = http.createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const relativePath = path.normalize(pathname).replace(/^(\.\.(\/|\\|$))+/, "").replace(/^[/\\]+/, "");
    const filePath = pathname.endsWith("/") ? path.join(root, relativePath, "index.html") : path.join(root, relativePath);

    if (!filePath.startsWith(root + path.sep) && filePath !== root) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    fs.readFile(filePath, (error, content) => {
      if (error) {
        response.writeHead(404).end("Not found");
        return;
      }

      response.writeHead(200, {
        "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream"
      });
      response.end(content);
    });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  browser = await chromium.launch({ headless: true });

  const reducedContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "reduce"
  });
  const page = await reducedContext.newPage();
  page.on("pageerror", error => errors.push(error.message));

  await page.goto(`http://127.0.0.1:${address.port}${target}`, { waitUntil: "networkidle" });

  assert.equal(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), true);
  assert.equal(await page.locator("#alice-container img").count(), 3);
  assert.equal(await page.locator("#alice-container").isVisible(), true);

  const motionState = await page.locator("#alice-container img").evaluateAll(images =>
    images.map(image => {
      const style = getComputedStyle(image);
      return {
        visible: image.getBoundingClientRect().width > 0 && image.getBoundingClientRect().height > 0,
        animationName: style.animationName,
        transitionDuration: style.transitionDuration
      };
    })
  );

  assert.ok(motionState.every(item => item.visible), "All Alice images must remain visible");
  assert.ok(motionState.every(item => item.animationName === "none"), "Images must remain static");
  assert.ok(motionState.every(item => item.transitionDuration === "0s"), "Images must have no transition");

  const focusTargets = ["alice-container", "alice1", "alice2", "alice3"];
  const focusResults = [];

  for (const width of [768, 1280]) {
    await page.goto(`http://127.0.0.1:${address.port}${target}`, { waitUntil: "networkidle" });
    await page.setViewportSize({ width, height: 800 });

    for (const id of focusTargets) {
      await page.keyboard.press("Tab");
      const result = await page.evaluate(expectedId => {
        const element = document.activeElement;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        return {
          id: element.id,
          outlineStyle: style.outlineStyle,
          outlineWidth: style.outlineWidth,
          visible: rect.width > 0 && rect.height > 0
        };
      }, id);

      assert.equal(result.id, id, `Expected keyboard focus on ${id} at ${width}px`);
      assert.equal(result.outlineStyle, "solid", `${id} must show a visible focus outline`);
      assert.ok(parseFloat(result.outlineWidth) >= 3, `${id} focus outline must be at least 3px`);
      assert.equal(result.visible, true, `${id} must remain visible at ${width}px`);
      focusResults.push({ width, ...result });
    }

    await page.evaluate(() => document.activeElement.blur());
  }

  const normalContext = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    reducedMotion: "no-preference"
  });
  const normalPage = await normalContext.newPage();
  normalPage.on("pageerror", error => errors.push(error.message));
  await normalPage.goto(`http://127.0.0.1:${address.port}${target}`, { waitUntil: "networkidle" });

  assert.equal(await normalPage.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches), false);
  assert.equal(
    await normalPage.locator("#alice-container img").evaluateAll(images =>
      images.every(image => getComputedStyle(image).animationName === "none")
    ),
    true,
    "The original page must remain static without reduced-motion preference too"
  );

  assert.deepEqual(errors, [], "The page must not produce unexpected JavaScript errors");

  const evidence = [
    "R18-T009 regression test",
    `Node: ${process.version}`,
    `Playwright: ${JSON.parse(fs.readFileSync(path.join(root, "tests/course/node_modules/playwright/package.json"), "utf8")).version}`,
    "Browser: Chromium",
    "Reduced motion: emulated and verified",
    `Static image state: ${JSON.stringify(motionState)}`,
    `Keyboard focus at 768px and 1280px: ${JSON.stringify(focusResults)}`,
    `Page errors: ${JSON.stringify(errors)}`,
    "Result: PASS"
  ].join("\n");

  fs.writeFileSync(path.join(root, "work/R18-T009/after.txt"), evidence + "\n");
  console.log(evidence);
  await normalContext.close();
  await reducedContext.close();
} catch (error) {
  console.error("R18-T009 regression test failed:", error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
