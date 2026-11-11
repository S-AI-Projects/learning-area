import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const targetPath =
  "/html/introduction-to-html/html-text-formatting/text-start.html";

const expectedBodyText = [
  "Quick hummus recipe",
  "This recipe makes quick, tasty hummus, with no messing. It has been adapted from a number of different recipes that I have read over the years.",
  "Hummus is a delicious thick paste used heavily in Greek and Middle Eastern dishes. It is very tasty with salad, grilled meats and pitta breads.",
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
  "For a different flavour, you could try blending in a small measure of lemon and coriander, chili pepper, lime and chipotle, harissa and mint, or spinach and feta cheese. Experiment and see what works for you.",
  "Storage",
  "Refrigerate the finished hummus in a sealed container. You should be able to use it for about a week after you've made it. If it starts to become fizzy, you should definitely discard it.",
  "Hummus is suitable for freezing; you should thaw it and use it within a couple of months.",
].join(" ");

async function startServer() {
  const server = createServer(async (req, res) => {
    try {
      const pathname = new URL(
        req.url,
        "http://127.0.0.1",
      ).pathname;

      const requestedPath = path.resolve(root, "." + pathname);

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
    baseURL: "http://127.0.0.1:" + server.address().port,
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
  const consoleErrors = [];
  const unexpectedRequests = [];

  try {
    const page = await context.newPage();

    page.on("pageerror", (error) => {
      pageErrors.push(error.message);
    });

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push(message.text());
      }
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

    const response = await page.goto(baseURL + targetPath, {
      waitUntil: "load",
    });

    assert.ok(response, "Page did not return a response");
    assert.equal(response.status(), 200);

    await page.locator("body").waitFor({ state: "visible" });

    // Capture the source page before adding any test-only styles.
    const source = await page.evaluate(() => ({
      title: document.title,
      language: document.documentElement.lang,
      bodyChildElementCount: document.body.children.length,
      linkedStylesheets: document.querySelectorAll(
        'link[rel="stylesheet"]',
      ).length,
      inlineStyleElements: document.querySelectorAll("style").length,
      images: document.images.length,
      scripts: document.scripts.length,
      sourceStylesheetCount: document.styleSheets.length,
    }));

    // Explicit local typography fixture. The target has no images or
    // external font assets, so no image fixture is required.
    await page.addStyleTag({
      content: [
        "html, body {",
        "  font-family: monospace !important;",
        "  font-size: 16px !important;",
        "  line-height: 24px !important;",
        "  margin: 0 !important;",
        "}",
      ].join("\n"),
    });

    const snapshot = await page.evaluate(() => {
      const body = document.body;
      const style = getComputedStyle(body);
      const rect = body.getBoundingClientRect();

      return {
        title: document.title,
        language: document.documentElement.lang,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        bodyText: body.innerText.replace(/\s+/g, " ").trim(),
        bodyChildElementCount: body.children.length,
        fontFamily: style.fontFamily,
        fontSize: style.fontSize,
        lineHeight: style.lineHeight,
        display: style.display,
        marginTop: style.marginTop,
        marginLeft: style.marginLeft,
        bodyWidth: rect.width,
        bodyLeft: rect.left,
        images: document.images.length,
        scripts: document.scripts.length,
      };
    });

    assert.equal(source.title, "Quick hummus recipe");
    assert.equal(source.language, "en-US");
    assert.equal(source.bodyChildElementCount, 0);
    assert.equal(source.linkedStylesheets, 0);
    assert.equal(source.inlineStyleElements, 0);
    assert.equal(source.images, 0);
    assert.equal(source.scripts, 0);
    assert.equal(source.sourceStylesheetCount, 0);

    assert.equal(snapshot.title, "Quick hummus recipe");
    assert.equal(snapshot.language, "en-US");
    assert.deepEqual(snapshot.viewport, {
      width: 1280,
      height: 800,
    });
    assert.equal(snapshot.bodyText, expectedBodyText);
    assert.equal(snapshot.bodyChildElementCount, 0);
    assert.equal(snapshot.fontFamily, "monospace");
    assert.equal(snapshot.fontSize, "16px");
    assert.equal(snapshot.lineHeight, "24px");
    assert.equal(snapshot.display, "block");
    assert.equal(snapshot.marginTop, "0px");
    assert.equal(snapshot.marginLeft, "0px");
    assert.equal(snapshot.bodyWidth, 1280);
    assert.equal(snapshot.bodyLeft, 0);
    assert.equal(snapshot.images, 0);
    assert.equal(snapshot.scripts, 0);

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
    assert.deepEqual(
      consoleErrors,
      [],
      "Unexpected browser console errors detected",
    );

    return { source, snapshot };
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

    const passMessages = [
      "PASS: Test-managed local server started and served HTTP 200.",
      "PASS: Original source has no linked styles, scripts, or images.",
      "PASS: Entire rendered recipe matches the expected baseline text.",
      "PASS: Original plain-text body structure is preserved.",
      "PASS: Fixed viewport and typography fixture are verified.",
      "PASS: Computed body layout matches the expected values.",
      "PASS: No external requests, page errors, or console errors.",
      "PASS: Two fresh contexts produced identical source and DOM snapshots.",
    ];

    const evidence = [
      "R18-T044 browser regression — actual run evidence",
      "Command: node tests/course/r18-t044.mjs",
      "Result: PASS",
      "Node.js: " + process.version,
      "",
      ...passMessages,
      "",
      "EXPECTED BASELINE BODY TEXT:",
      expectedBodyText,
      "",
      "ACTUAL SOURCE INSPECTION:",
      JSON.stringify(first.source, null, 2),
      "",
      "ACTUAL RENDERED DOM AND COMPUTED LAYOUT:",
      JSON.stringify(first.snapshot, null, 2),
      "",
      "Fresh-context comparison: identical",
    ].join("\n");

    await writeFile(
      path.join(root, "work/R18-T044/actual-results.txt"),
      evidence + "\n",
      "utf8",
    );

    for (const message of passMessages) console.log(message);
    console.log("Evidence written to work/R18-T044/actual-results.txt");
    console.log("EXPECTED BODY TEXT: " + expectedBodyText);
    console.log("ACTUAL SNAPSHOT: " + JSON.stringify(first));
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
