
import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

const server = createServer(async (req, res) => {
  try {
    const exampleDir = "html/forms/image-type-xy-coords/";
    const file = req.url === "/"
        ? `${exampleDir}index.html`
        : `${exampleDir}${req.url.slice(1)}`;

    const filePath = path.resolve(root, file);

    if (!filePath.startsWith(root + path.sep)) {
      res.writeHead(403).end();
      return;
    }

    const content = await readFile(filePath);
    const type = file.endsWith(".png") ? "image/png" : "text/html";

    res.writeHead(200, { "Content-Type": type });
    res.end(content);
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
  const pageErrors = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(`http://127.0.0.1:${address.port}/`);

  // Baseline checks on the original example.
  const image = page.locator("#image");

  assert.equal(await image.count(), 1);
  assert.equal(await image.getAttribute("type"), "image");
  const imageResponse = await page.request.get(
    new URL(await image.getAttribute("src"), page.url()).href
  );
  assert.equal(imageResponse.status(), 200);
  assert.match(imageResponse.headers()["content-type"], /image\/png/);

  const originalLayout = await image.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  });

  assert.ok(originalLayout.width > 0);
  assert.ok(originalLayout.height > 0);

  console.log("PASS: Original image input loads and has visible layout.");

  // Isolated harness for repeated style/demo toggles.
  await page.evaluate(() => {
    const style = document.createElement("style");
    style.id = "r18-test-style";
    style.textContent = `
      #image.r18-highlight {
        outline: 4px solid green;
      }
    `;
    document.head.appendChild(style);

    window.r18Updates = 0;
    window.r18Controller = new AbortController();

    window.initializeDemo = () => {
      let button = document.querySelector("#r18-toggle");

      if (!button) {
        button = document.createElement("button");
        button.id = "r18-toggle";
        button.type = "button";
        button.textContent = "Toggle image highlight";
        document.querySelector("form").appendChild(button);

        const status = document.createElement("p");
        status.id = "r18-status";
        status.textContent = "Highlight is off";
        document.querySelector("form").appendChild(status);

        button.addEventListener("click", () => {
          const highlighted = document
            .querySelector("#image")
            .classList.toggle("r18-highlight");

          window.r18Updates++;
          status.textContent = highlighted
            ? "Highlight is on"
            : "Highlight is off";
        }, { signal: window.r18Controller.signal });
      }
    };

    window.cleanupDemo = () => {
      window.r18Controller.abort();
      document.querySelector("#r18-toggle")?.remove();
      document.querySelector("#r18-status")?.remove();
      document.querySelector("#r18-test-style")?.remove();
    };

    // Initialize twice to check duplicate setup.
    window.initializeDemo();
    window.initializeDemo();
  });

  const toggle = page.locator("#r18-toggle");
  const status = page.locator("#r18-status");

  assert.equal(await toggle.count(), 1);
  assert.equal(await status.count(), 1);

  await toggle.click();

  assert.equal(await image.evaluate((el) =>
    getComputedStyle(el).outlineWidth), "4px");
  assert.equal(await status.textContent(), "Highlight is on");

  await toggle.click();

  assert.equal(await image.evaluate((el) =>
    el.classList.contains("r18-highlight")), false);
  assert.equal(await status.textContent(), "Highlight is off");

  assert.equal(await page.evaluate(() => window.r18Updates), 2);
  assert.equal(await toggle.count(), 1);
  assert.equal(await status.count(), 1);

  console.log("PASS: Repeated initialization creates only one toggle and status element.");
  console.log("PASS: Two toggles produce exactly two updates and restore the original style.");

  const savedButton = await toggle.elementHandle();

  await page.evaluate(() => window.cleanupDemo());

  assert.equal(await page.locator("#r18-toggle").count(), 0);
  assert.equal(await page.locator("#r18-status").count(), 0);
  assert.equal(await page.locator("#r18-test-style").count(), 0);

  await savedButton.evaluate((button) => button.click());
  assert.equal(await page.evaluate(() => window.r18Updates), 2);

  assert.deepEqual(pageErrors, []);

  console.log("PASS: Cleanup removes test elements and disables the event listener.");
  console.log("PASS: No unexpected browser errors.");

  await context.close();
} catch (error) {
  console.error("FAIL:", error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
