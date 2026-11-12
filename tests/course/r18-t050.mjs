import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
import { chromium } from "playwright";

const root = process.cwd();
const sourcePath = path.join(
  root,
  "html/forms/custom-radio-styles/index.html"
);
const evidenceDir = path.join(root, "work/R18-T050");

const html = fs.readFileSync(sourcePath, "utf8");
const expectedOrder = ["Cherry", "Banana", "Strawberry"];
const expectedValues = ["cherry", "banana", "strawberry"];

const server = http.createServer((req, res) => {
  const requestUrl = new URL(req.url, "http://127.0.0.1");

  if (requestUrl.pathname !== "/") {
    res.writeHead(404);
    return res.end("Not found");
  }

  let response = html;

  if (requestUrl.searchParams.get("mutation") === "overflow") {
    response = response.replace(
      "</style>",
      "fieldset { min-width: 1000px; }\n</style>"
    );
  }

  res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
  res.end(response);
});

function record(name, expected, actual) {
  return { name, expected, actual };
}

async function inspectPage(page, viewport) {
  const errors = [];

  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => {
    if (message.type() === "error") errors.push(message.text());
  });

  await page.goto("http://127.0.0.1:" + server.address().port, {
    waitUntil: "load"
  });

  const layout = await page.evaluate(() => {
    const form = document.querySelector("form");
    const fieldset = document.querySelector("fieldset");
    const radios = [...document.querySelectorAll('input[type="radio"]')];

    const rect = element => {
      const r = element.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        right: r.right,
        bottom: r.bottom,
        width: r.width,
        height: r.height
      };
    };

    return {
      title: document.title,
      heading: document.querySelector("legend")?.textContent.trim(),
      order: [...form.querySelectorAll("label")].map(label =>
        label.textContent.trim().replace(/\s+/g, " ")
      ),
      values: radios.map(radio => radio.value),
      viewportWidth: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      bodyWidth: document.body.scrollWidth,
      form: rect(form),
      fieldset: rect(fieldset),
      radios: radios.map(radio => ({
        value: radio.value,
        rect: rect(radio),
        appearance: getComputedStyle(radio).appearance,
        borderRadius: getComputedStyle(radio).borderRadius
      }))
    };
  });

  // Horizontal overflow must be rejected before other layout assertions.
  assert.ok(
    layout.documentWidth <= viewport.width,
    `Horizontal overflow: document is ${layout.documentWidth}px wide ` +
    `in a ${viewport.width}px viewport`
  );

  assert.ok(
    layout.bodyWidth <= viewport.width,
    `Horizontal overflow: body is ${layout.bodyWidth}px wide`
  );

  assert.equal(layout.title, "Radio buttons styled");
  assert.equal(layout.heading, "Choose your favourite fruit");
  assert.deepEqual(layout.order, expectedOrder);
  assert.deepEqual(layout.values, expectedValues);
  assert.equal(layout.radios.length, 3);

  for (const [index, radio] of layout.radios.entries()) {
    assert.equal(radio.rect.width, 20, `${radio.value} width`);
    assert.equal(radio.rect.height, 20, `${radio.value} height`);
    assert.equal(radio.appearance, "none");
    assert.ok(radio.rect.x >= layout.fieldset.x, `${radio.value} left clipped`);
    assert.ok(
      radio.rect.right <= layout.fieldset.right,
      `${radio.value} right clipped`
    );
    assert.ok(radio.rect.x >= 0 && radio.rect.right <= viewport.width);
    assert.ok(radio.rect.y >= 0 && radio.rect.bottom <= viewport.height);
    assert.equal(radio.value, expectedValues[index]);
  }

  assert.ok(layout.form.x >= 0);
  assert.ok(layout.form.right <= viewport.width);
  assert.ok(layout.fieldset.x >= 0);
  assert.ok(layout.fieldset.right <= viewport.width);

  // Mouse interaction: native radio group must remain mutually exclusive.
  await page.locator('input[value="cherry"]').check();
  assert.equal(await page.locator('input[value="cherry"]').isChecked(), true);

  await page.locator('input[value="banana"]').check();
  assert.equal(await page.locator('input[value="banana"]').isChecked(), true);
  assert.equal(await page.locator('input[value="cherry"]').isChecked(), false);

  // Keyboard interaction: ArrowRight moves to the next radio option.
  await page.locator('input[value="cherry"]').focus();
  await page.locator('input[value="cherry"]').press("ArrowRight");
  assert.equal(await page.locator('input[value="banana"]').isChecked(), true);

  // Computed pseudo-element style: checked indicator is visible.
  await page.locator('input[value="strawberry"]').check();
  await page.waitForTimeout(350);

  const indicatorScale = await page.evaluate(() => {
    const radio = document.querySelector('input[value="strawberry"]');
    const transform = getComputedStyle(radio, "::before").transform;
    return new DOMMatrix(transform).a;
  });

  assert.ok(indicatorScale > 0.9, "Checked radio indicator should be visible");

  assert.deepEqual(errors, [], "Unexpected browser errors");

  return {
    viewport,
    layout,
    interactions: {
      mouseSelection: "PASS",
      exclusiveSelection: "PASS",
      keyboardArrowRight: "PASS",
      checkedIndicatorScale: indicatorScale
    },
    browserErrors: errors
  };
}

async function main() {
  fs.mkdirSync(evidenceDir, { recursive: true });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  let browser;

  try {
    browser = await chromium.launch({ headless: true });
    const results = [];

    for (const viewport of [
      { width: 360, height: 800 },
      { width: 1280, height: 800 }
    ]) {
      const context = await browser.newContext({ viewport });

      try {
        const page = await context.newPage();
        const result = await inspectPage(page, viewport);

        await page.screenshot({
          path: path.join(
            evidenceDir,
            `verified-${viewport.width}x${viewport.height}.png`
          ),
          fullPage: true
        });

        results.push(result);
        console.log(`PASS ${viewport.width}x${viewport.height}`);
      } finally {
        await context.close();
      }
    }

    // Mutation check: deliberately force horizontal overflow on mobile.
    const mutationContext = await browser.newContext({
      viewport: { width: 360, height: 800 }
    });

    let mutationResult;

    try {
      const mutationPage = await mutationContext.newPage();
      let detected = false;
      let message = "";

      try {
        await mutationPage.goto(
          `http://127.0.0.1:${server.address().port}/?mutation=overflow`,
          { waitUntil: "load" }
        );

        const width = await mutationPage.evaluate(
          () => document.documentElement.scrollWidth
        );

        assert.ok(
          width <= 360,
          `Horizontal overflow: document is ${width}px wide in a 360px viewport`
        );
      } catch (error) {
        message = error.message;
        detected = message.includes("Horizontal overflow");
      }

      assert.equal(
        detected,
        true,
        "Mutation test failed: expected horizontal overflow was not detected"
      );

      mutationResult = {
        expected: "Horizontal overflow detected",
        actual: message,
        result: "PASS"
      };

      console.log("PASS mutation detection");
    } finally {
      await mutationContext.close();
    }

    const report = {
      task: "R18-T050",
      node: process.version,
      playwright: require("playwright/package.json").version,
      chromium: browser.version(),
      server: "Node.js HTTP static lesson server",
      source: "html/forms/custom-radio-styles/index.html",
      results,
      mutationTest: mutationResult
    };

    fs.writeFileSync(
      path.join(evidenceDir, "results.json"),
      JSON.stringify(report, null, 2)
    );

    console.log("\nAll R18-T050 checks passed.");
    console.log(`Evidence: ${evidenceDir}`);
  } finally {
    if (browser) await browser.close();

    if (server.listening) {
      await new Promise(resolve => server.close(resolve));
    }
  }
}

main().catch(error => {
  console.error("\nR18-T050 FAILED");
  console.error(error);
  process.exitCode = 1;
});
