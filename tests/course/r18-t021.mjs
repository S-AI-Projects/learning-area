
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const port = 4178;
const target =
  "/html/introduction-to-html/getting-started/index.html";

let server;
let browser;
let context;

const browserErrors = [];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

try {
  // Start a local static HTTP server.
  server = createServer(async (req, res) => {
    try {
      const pathname = new URL(
        req.url,
        "http://127.0.0.1"
      ).pathname;

      const file = resolve(root, "." + pathname);

      assert.ok(
        file.startsWith(root + sep),
        "Request must stay inside repository"
      );

      const content = await readFile(file);

      res.writeHead(200, {
        "Content-Type":
          mimeTypes[extname(file)] ||
          "application/octet-stream"
      });

      res.end(content);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolveListen);
  });

  // Verify server readiness.
  const response = await fetch(
    `http://127.0.0.1:${port}${target}`
  );

  assert.equal(response.status, 200);

  browser = await chromium.launch({
    headless: true
  });

  // Use a fresh browser context.
  context = await browser.newContext();
  const page = await context.newPage();

  page.on("pageerror", error => {
    browserErrors.push(error.message);
  });

  page.on("console", message => {
    if (message.type() === "error") {
      browserErrors.push(message.text());
    }
  });

  page.on("requestfailed", request => {
    browserErrors.push(
      `Request failed: ${request.url()}`
    );
  });

  await page.goto(
    `http://127.0.0.1:${port}${target}`,
    { waitUntil: "networkidle" }
  );

  // Check the original teaching content.
  const main = page.locator("main#main-content");

  assert.equal(await main.count(), 1);

  assert.equal(
    (await main.innerText()).trim(),
    "This is my page"
  );

  // Check the skip link.
  const skip = page.getByRole("link", {
    name: "Skip to main content"
  });

  assert.equal(await skip.count(), 1);

  assert.equal(
    await skip.getAttribute("href"),
    "#main-content"
  );

  // First Tab should focus the skip link.
  await page.keyboard.press("Tab");

  assert.equal(
    await skip.evaluate(
      el => el === document.activeElement
    ),
    true,
    "Tab must focus the skip link"
  );

  // Verify visible focus.
  const focusStyle = await skip.evaluate(el => {
    const style = getComputedStyle(el);

    return {
      top: style.top,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      visibility: style.visibility,
      display: style.display
    };
  });

  assert.equal(focusStyle.top, "10px");
  assert.notEqual(focusStyle.outlineStyle, "none");
  assert.notEqual(focusStyle.outlineWidth, "0px");
  assert.notEqual(focusStyle.visibility, "hidden");
  assert.notEqual(focusStyle.display, "none");

  // Activate skip link using Enter.
  await page.keyboard.press("Enter");

  await page.waitForFunction(
    () => location.hash === "#main-content"
  );

  assert.equal(
    await main.evaluate(
      el => el === document.activeElement
    ),
    true,
    "Enter must move focus to main content"
  );

  // Reject positive tabindex values.
  const positiveTabindex = await page.locator(
    "[tabindex]"
  ).evaluateAll(elements =>
    elements.filter(
      el => Number(el.getAttribute("tabindex")) > 0
    ).length
  );

  assert.equal(
    positiveTabindex,
    0,
    "Positive tabindex values are not allowed"
  );

  // Reject unexpected browser errors.
  assert.deepEqual(
    browserErrors,
    [],
    "Unexpected browser errors occurred"
  );

  console.log("PASS: R18-T021 keyboard accessibility");
  console.log("PASS: Tab navigation");
  console.log("PASS: Visible focus");
  console.log("PASS: Enter activation");
  console.log("PASS: Main content focus");
  console.log("PASS: No positive tabindex");
  console.log("PASS: No unexpected browser errors");

} catch (error) {
  console.error("FAIL: R18-T021");
  console.error(error);
  process.exitCode = 1;

} finally {
  if (context) {
    await context.close();
  }

  if (browser) {
    await browser.close();
  }

  if (server) {
    await new Promise(resolveClose => {
      server.close(resolveClose);
      server.closeAllConnections();
    });
  }
}
