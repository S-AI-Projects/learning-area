import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const target = "/javascript/oojs/json/heroes.html";
const cssPath = path.join(root, "javascript/oojs/json/style.css");
const originalCss = fs.readFileSync(cssPath, "utf8");

const server = http.createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;
  const filePath = path.resolve(root, `.${pathname}`);

  if (!filePath.startsWith(root + path.sep)) {
    res.writeHead(403).end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404).end("Not found");
      return;
    }

    const extension = path.extname(filePath);
    const types = {
      ".html": "text/html",
      ".css": "text/css",
      ".json": "application/json",
    };

    res.writeHead(200, {
      "Content-Type": types[extension] || "application/octet-stream",
    });
    res.end(content);
  });
});

function checkLayout(layout) {
  assert.equal(layout.count, 3, "The page should display three heroes.");
  assert.deepEqual(
    layout.names,
    ["Molecule Man", "Madame Uppercut", "Eternal Flame"],
    "The hero names should match the JSON data."
  );
  assert.ok(
    layout.sameRow,
    "The three hero cards should appear in one row."
  );
}

async function inspectPage(browser, baseURL, mutateCss = false) {
  const page = await browser.newPage();
  const pageErrors = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));

  if (mutateCss) {
    await page.route("**/style.css", async (route) => {
      const brokenCss = originalCss.replace(
        /width:\s*33%;/,
        "width: 100%;"
      );

      assert.notEqual(
        brokenCss,
        originalCss,
        "The temporary CSS mutation should be applied."
      );

      await route.fulfill({
        status: 200,
        contentType: "text/css",
        body: brokenCss,
      });
    });
  }

  await page.goto(`${baseURL}${target}`);

  await page.locator("section article").nth(2).waitFor();

  const layout = await page.evaluate(() => {
    const articles = [...document.querySelectorAll("section article")];
    const boxes = articles.map((article) => article.getBoundingClientRect());

    return {
      heading: document.querySelector("header h1")?.textContent,
      headerDetails: document.querySelector("header p")?.textContent,
      count: articles.length,
      names: articles.map((article) => article.querySelector("h2")?.textContent),
      sameRow: boxes.every((box) => Math.abs(box.y - boxes[0].y) < 2),
      positions: boxes.map((box) => ({
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
      })),
    };
  });

  assert.equal(layout.heading, "Super Hero Squad");
  assert.equal(
    layout.headerDetails,
    "Hometown: Metro City // Formed: 2016"
  );

  assert.deepEqual(pageErrors, [], "The page should have no JavaScript errors.");

  await page.close();
  return layout;
}

let browser;

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  const baseURL = `http://127.0.0.1:${address.port}`;

  browser = await chromium.launch({ headless: true });

  const baseline = await inspectPage(browser, baseURL);
  checkLayout(baseline);

  const mutated = await inspectPage(browser, baseURL, true);

  assert.equal(mutated.count, 3);
  assert.equal(
    mutated.sameRow,
    false,
    "The test should detect the broken layout when hero width is changed to 100%."
  );

  console.log("R18-T010 regression test");
  console.log("Correct page: PASS");
  console.log("Deliberately broken CSS fixture: detected");
  console.log("Baseline layout:", JSON.stringify(baseline));
  console.log("Mutated layout:", JSON.stringify(mutated));
  console.log("Page errors: none");
  console.log("Result: PASS");
} finally {
  if (browser) {
    await browser.close();
  }

  if (server.listening) {
    await new Promise((resolve) => server.close(resolve));
  }
}