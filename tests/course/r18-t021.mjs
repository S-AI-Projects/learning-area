
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const target =
  "/html/introduction-to-html/getting-started/index.html";

let server;
let browser;
let context;

const browserErrors = [];
const serverErrors = [];

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

try {
  // Start a local static HTTP server on an available port.
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
    } catch (error) {
      serverErrors.push(error.message);
      res.writeHead(500);
      res.end("Static server error");
    }
  });

  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });

  // Verify server readiness.
  const address = server.address();
  assert.ok(address && typeof address === "object");

  const baseUrl = `http://127.0.0.1:${address.port}`;
  const response = await fetch(`${baseUrl}${target}`);

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

  const documentResponse = await page.goto(`${baseUrl}${target}`, {
    waitUntil: "networkidle"
  });

  assert.equal(documentResponse?.status(), 200);

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
      left: style.left,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      visibility: style.visibility,
      display: style.display,
      opacity: style.opacity,
      bounds: {
        x: el.getBoundingClientRect().x,
        y: el.getBoundingClientRect().y,
        right: el.getBoundingClientRect().right,
        bottom: el.getBoundingClientRect().bottom
      },
      viewport: {
        width: innerWidth,
        height: innerHeight
      }
    };
  });

  assert.equal(focusStyle.top, "10px");
  assert.equal(focusStyle.left, "10px");
  assert.notEqual(focusStyle.outlineStyle, "none");
  assert.equal(focusStyle.outlineWidth, "3px");
  assert.equal(focusStyle.visibility, "visible");
  assert.notEqual(focusStyle.display, "none");
  assert.ok(Number(focusStyle.opacity) > 0);
  assert.ok(focusStyle.bounds.x >= 0);
  assert.ok(focusStyle.bounds.y >= 0);
  assert.ok(focusStyle.bounds.right <= focusStyle.viewport.width);
  assert.ok(focusStyle.bounds.bottom <= focusStyle.viewport.height);

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

  assert.deepEqual(
    serverErrors,
    [],
    "Unexpected local server errors occurred"
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
