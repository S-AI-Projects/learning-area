import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const targetPath =
  "/html/introduction-to-html/html-text-formatting/text-start.html";

const expectedText = [
  "Quick hummus recipe",
  "This recipe makes quick, tasty hummus, with no messing.",
  "Hummus is a delicious thick paste used heavily in Greek and Middle Eastern dishes.",
  "Ingredients",
  "1 can (400g) of chick peas (garbanzo beans)",
  "175g of tahini",
  "6 sundried tomatoes",
  "Half a red pepper",
  "A pinch of cayenne pepper",
  "1 clove of garlic",
  "A dash of olive oil",
  "Instructions",
  "Remove the skin from the garlic, and chop coarsely",
  "Remove all the seeds and stalk from the pepper, and chop coarsely",
  "Add all the ingredients into a food processor",
  "Process all the ingredients into a paste.",
  'If you want a coarse "chunky" hummus, process it for a short time',
  "If you want a smooth hummus, process it for a longer time",
  "Storage",
  "Refrigerate the finished hummus in a sealed container.",
  "Hummus is suitable for freezing",
];

async function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const pathname = new URL(
        req.url,
        "http://127.0.0.1",
      ).pathname;

      const requestedPath = path.resolve(root, `.${pathname}`);

      assert.ok(
        requestedPath.startsWith(root + path.sep),
        "Request attempted to access a path outside the project",
      );

      const content = await readFile(requestedPath);

      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      });

      res.end(content);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  return {
    server,
    baseURL: `http://127.0.0.1:${server.address().port}`,
  };
}

async function inspectFreshContext(browser, baseURL) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 1,
    locale: "en-US",
    timezoneId: "UTC",
    reducedMotion: "reduce",
  });

  const pageErrors = [];
  const unexpectedRequests = [];

  try {
    const page = await context.newPage();

    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    await context.route("**/*", async (route) => {
      const requestURL = new URL(route.request().url());

      if (requestURL.origin !== baseURL) {
        unexpectedRequests.push(route.request().url());
        await route.abort();
        return;
      }

      await route.continue();
    });

    const response = await page.goto(`${baseURL}${targetPath}`, {
      waitUntil: "load",
    });

    assert.ok(response, "Page did not return a response");
    assert.equal(response.status(), 200);

    await page.locator("body").waitFor({ state: "visible" });

    // Explicit local test fixture: no external fonts or assets.
    await page.addStyleTag({
      content: `
        html, body {
          font-family: monospace !important;
          font-size: 16px !important;
        }
      `,
    });

    const snapshot = await page.evaluate(() => {
      const body = document.body;
      const style = getComputedStyle(body);

      return {
        title: document.title,
        language: document.documentElement.lang,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        bodyText: body.innerText.replace(/\s+/g, " ").trim(),
        childElementCount: body.children.length,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        display: style.display,
        images: document.images.length,
        scripts: document.scripts.length,
        stylesheets: document.styleSheets.length,
      };
    });

    assert.equal(snapshot.title, "Quick hummus recipe");
    assert.equal(snapshot.language, "en-US");
    assert.deepEqual(snapshot.viewport, {
      width: 1280,
      height: 800,
    });

    assert.equal(snapshot.fontFamily, "monospace");
    assert.equal(snapshot.fontSize, "16px");
    assert.equal(snapshot.display, "block");

    // The starter page intentionally contains plain text.
    assert.equal(snapshot.childElementCount, 0);
    assert.equal(snapshot.images, 0);
    assert.equal(snapshot.scripts, 0);
    assert.equal(snapshot.stylesheets, 1);

    for (const text of expectedText) {
      assert.ok(
        snapshot.bodyText.includes(text),
        `Missing expected recipe text: ${text}`,
      );
    }

    assert.ok(
      snapshot.bodyText.indexOf("Ingredients") <
        snapshot.bodyText.indexOf("Instructions"),
      "Ingredients must appear before Instructions",
    );

    assert.ok(
      snapshot.bodyText.indexOf("Instructions") <
        snapshot.bodyText.indexOf("Storage"),
      "Instructions must appear before Storage",
    );

    assert.deepEqual(
      unexpectedRequests,
      [],
      "Unexpected external network requests detected",
    );

    assert.deepEqual(
      pageErrors,
      [],
      "Unexpected JavaScript page errors detected",
    );

    return snapshot;
  } finally {
    await context.close();
  }
}

async function main() {
  let browser;
  let server;

  try {
    const local = await startServer();
    server = local.server;

    browser = await chromium.launch({ headless: true });

    const first = await inspectFreshContext(browser, local.baseURL);
    const second = await inspectFreshContext(browser, local.baseURL);

    assert.deepEqual(
      second,
      first,
      "Fresh browser contexts produced different results",
    );

    console.log("PASS: Local server started successfully.");
    console.log("PASS: Target page returned HTTP 200.");
    console.log("PASS: Recipe text and ordering are correct.");
    console.log("PASS: Original plain-text HTML structure is preserved.");
    console.log("PASS: Fixed viewport and font fixture verified.");
    console.log("PASS: No external network requests.");
    console.log("PASS: No unexpected JavaScript page errors.");
    console.log("PASS: Two fresh contexts produced identical results.");
  } finally {
    try {
      if (browser) await browser.close();
    } finally {
      if (server?.listening) {
        await new Promise((resolve, reject) => {
          server.close((error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      }
    }
  }
}

main().catch((error) => {
  console.error("FAIL: R18-T044 regression test");
  console.error(error);
  process.exitCode = 1;
});
