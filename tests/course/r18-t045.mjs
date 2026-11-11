import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const targetDirectory = resolve(root, "javascript/oojs/bouncing-balls");
const evidenceDirectory = resolve(root, "work/R18-T045");
const port = 4175;
const origin = `http://127.0.0.1:${port}`;

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

const results = [];
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(
      new URL(request.url, origin).pathname
    );
    const filePath = resolve(targetDirectory, `.${pathname}`);

    if (
      filePath !== targetDirectory &&
      !filePath.startsWith(targetDirectory + sep)
    ) {
      response.writeHead(403);
      response.end("Forbidden");
      return;
    }

    const content = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
    });
    response.end(content);
  } catch {
    response.writeHead(404);
    response.end("Not found");
  }
});

let browser;

function record(name, status, details) {
  results.push({ name, status, details });
  console.log(`${status}: ${name} — ${details}`);
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt++) {
    try {
      const response = await fetch(`${origin}/index.html`);
      if (response.ok) return;
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  throw new Error("Local test server did not become ready.");
}

async function runSupportedTest() {
  const context = await browser.newContext({
    viewport: { width: 1000, height: 700 },
  });
  const page = await context.newPage();
  const pageErrors = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    await page.goto(`${origin}/index.html`, { waitUntil: "load" });

    const state = await page.evaluate(() => {
      const canvas = document.querySelector("canvas");
      const context2d = canvas?.getContext("2d");
      const heading = document.querySelector("h1");

      return {
        canvasPresent: Boolean(canvas),
        contextAvailable: Boolean(context2d),
        canvasWidth: canvas?.width,
        canvasHeight: canvas?.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        fallbackPresent: Boolean(document.querySelector("#canvas-fallback")),
        headingPresent: Boolean(heading),
        headingPosition: heading
          ? getComputedStyle(heading).position
          : null,
        bodyOverflow: getComputedStyle(document.body).overflow,
      };
    });

    assert.equal(state.canvasPresent, true);
    assert.equal(state.contextAvailable, true);
    assert.equal(state.canvasWidth, state.viewportWidth);
    assert.equal(state.canvasHeight, state.viewportHeight);
    assert.equal(state.fallbackPresent, false);
    assert.equal(state.headingPresent, true);
    assert.equal(state.headingPosition, "absolute");
    assert.equal(state.bodyOverflow, "hidden");
    assert.deepEqual(pageErrors, []);

    record(
      "Canvas 2D supported",
      "PASS",
      JSON.stringify(state)
    );
  } finally {
    await context.close();
  }
}

async function runUnsupportedTest() {
  const context = await browser.newContext();
  await context.addInitScript(() => {
    window.__canvasContextRequests = [];

    const originalGetContext = HTMLCanvasElement.prototype.getContext;

    HTMLCanvasElement.prototype.getContext = function (type, ...args) {
      if (type === "2d") {
        window.__canvasContextRequests.push(type);
        return null;
      }

      return originalGetContext.call(this, type, ...args);
    };
  });

  const page = await context.newPage();
  const pageErrors = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));

  try {
    await page.goto(`${origin}/index.html`, { waitUntil: "load" });

    const state = await page.evaluate(() => {
      const fallback = document.querySelector("#canvas-fallback");

      return {
        canvasRemoved: !document.querySelector("canvas"),
        fallbackPresent: Boolean(fallback),
        fallbackRole: fallback?.getAttribute("role"),
        fallbackText: fallback?.textContent,
        contextRequests: window.__canvasContextRequests,
        headingPresent: Boolean(document.querySelector("h1")),
      };
    });

    assert.equal(state.canvasRemoved, true);
    assert.equal(state.fallbackPresent, true);
    assert.equal(state.fallbackRole, "status");
    assert.match(state.fallbackText, /does not support the Canvas 2D API/i);
    assert.deepEqual(state.contextRequests, ["2d"]);
    assert.equal(state.headingPresent, true);
    assert.deepEqual(pageErrors, []);

    record(
      "Canvas 2D unsupported",
      "PASS",
      JSON.stringify(state)
    );
  } finally {
    await context.close();
  }
}

async function main() {
  try {
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, "127.0.0.1", resolve);
    });

    await waitForServer();

    browser = await chromium.launch({ headless: true });

    await runSupportedTest();
    await runUnsupportedTest();

    const { mkdir, writeFile } = await import("node:fs/promises");
    await mkdir(evidenceDirectory, { recursive: true });

    const report = [
      "R18-T045 regression test results",
      `Date: ${new Date().toISOString()}`,
      `Node.js: ${process.version}`,
      `Playwright: ${JSON.parse(await readFile(resolve(root, "node_modules/playwright/package.json"), "utf8")).version}`,
      `Browser: Chromium ${browser.version()}`,
      "",
      ...results.map(
        (result) => `${result.status}: ${result.name}\n${result.details}`
      ),
      "",
      `Total: ${results.length} passed`,
    ].join("\n");

    await writeFile(
      resolve(evidenceDirectory, "actual-results.txt"),
      report
    );

    console.log("\nAll regression tests passed.");
  } catch (error) {
    console.error("\nRegression test failed:", error);
    process.exitCode = 1;
  } finally {
    try {
      if (browser) await browser.close();
    } finally {
      if (server.listening) {
        await new Promise((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        });
      }
    }
  }
}

await main();
