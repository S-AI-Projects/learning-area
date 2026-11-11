
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, stat, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../html/multimedia-and-embedding/responsive-images"
);
const evidenceDir = path.resolve("work/R18-T042");
const screenshotDir = path.join(evidenceDir, "screenshots");
const pagePath = "/responsive.html";
const missingFixture = "/__fixtures__/r18-t042-missing-image.jpg";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
};

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, "http://127.0.0.1").pathname;

  // Deliberate missing-asset fixture for the failure/recovery test.
  if (pathname === missingFixture) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Fixture: image asset intentionally unavailable");
    return;
  }

  try {
    const filePath = path.resolve(root, `.${decodeURIComponent(pathname)}`);

    if (filePath !== root && !filePath.startsWith(root + path.sep)) {
      res.writeHead(403).end("Forbidden");
      return;
    }

    const info = await stat(filePath);
    if (!info.isFile()) throw new Error("Not a file");

    const body = await readFile(filePath);

    res.writeHead(200, {
      "Content-Type":
        mimeTypes[path.extname(filePath)] ?? "application/octet-stream",
      "Content-Length": body.length,
    });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not found");
  }
});

let browser;

try {
  await mkdir(screenshotDir, { recursive: true });

  // Start the local server on an available port.
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  // Verify server readiness.
  const readiness = await fetch(`${baseUrl}${pagePath}`);
  assert.equal(readiness.status, 200, "Local example server must be ready");

  // Launch a fresh browser context.
  browser = await chromium.launch({ headless: true });

  const context = await browser.newContext({
    viewport: { width: 600, height: 900 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();
  const pageErrors = [];

  page.on("pageerror", error => pageErrors.push(error.message));

  await page.goto(`${baseUrl}${pagePath}`, { waitUntil: "load" });

  const images = page.locator("main img");

  assert.equal(
    await images.count(),
    2,
    "Example should contain two content images"
  );

  const firstImage = images.nth(0);
  const secondImage = images.nth(1);

  // Baseline: both images load successfully.
  await page.waitForFunction(() =>
    [...document.querySelectorAll("main img")].length === 2 &&
    [...document.querySelectorAll("main img")].every(
      img => img.complete && img.naturalWidth > 0
    )
  );

  assert.equal(
    await firstImage.getAttribute("alt"),
    "Chris standing up holding his daughter Elva"
  );

  assert.equal(
    await secondImage.getAttribute("alt"),
    "Elva dressed as a fairy"
  );

  // Mobile viewport: select the narrow picture source.
  await page.setViewportSize({ width: 600, height: 900 });

  await page.waitForFunction(() =>
    document
      .querySelector("picture img")
      ?.currentSrc.includes("elva-480w-close-portrait.jpg")
  );

  await page.screenshot({
    path: path.join(screenshotDir, "mobile-baseline.png"),
    fullPage: true,
  });

  // Desktop viewport: select the wider picture source.
  await page.setViewportSize({ width: 1000, height: 900 });

  await page.waitForFunction(() =>
    document
      .querySelector("picture img")
      ?.currentSrc.includes("elva-800w.jpg")
  );

  await page.screenshot({
    path: path.join(screenshotDir, "desktop-baseline.png"),
    fullPage: true,
  });

  // Verify the second image selects a supplied responsive asset.
  const secondSource = await secondImage.evaluate(img => img.currentSrc);

  assert.match(
    secondSource,
    /elva-fairy-(320|480|640|800)w\.jpg$/,
    "The second image should select a supplied responsive asset"
  );

  // Verify images remain within the viewport.
  const layout = await images.evaluateAll(nodes =>
    nodes.map(img => {
      const style = getComputedStyle(img);
      const rect = img.getBoundingClientRect();

      return {
        display: style.display,
        maxWidth: style.maxWidth,
        right: rect.right,
        viewportWidth: innerWidth,
      };
    })
  );

  for (const item of layout) {
    assert.equal(item.display, "block");
    assert.equal(item.maxWidth, "100%");
    assert.ok(
      item.right <= item.viewportWidth + 1,
      "Image must fit the viewport"
    );
  }

  // Save original picture attributes for recovery.
  const original = await firstImage.evaluate(img => ({
    src: img.getAttribute("src"),
    sources: [...img.parentElement.querySelectorAll("source")].map(source => ({
      srcset: source.getAttribute("srcset"),
      media: source.getAttribute("media"),
    })),
  }));

  // Wait for the fixture response before triggering the missing-image request.
  const fixtureResponsePromise = page.waitForResponse(response =>
    response.url().includes(missingFixture)
  );

  // Failure fixture: point picture sources and fallback image at a missing asset.
  const failure = firstImage.evaluate(async (img, fixture) => {
    const errorEvent = new Promise(resolve => {
      img.addEventListener("error", resolve, { once: true });
    });

    img.parentElement.querySelectorAll("source").forEach(source => {
      source.srcset = fixture;
    });

    img.src = fixture;

    let timeoutId;

    try {
      await Promise.race([
        errorEvent,
        new Promise((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new Error("Timed out waiting for image error")),
            5000
          );
        }),
      ]);
    } finally {
      clearTimeout(timeoutId);
    }

    return {
      alt: img.alt,
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      currentSrc: img.currentSrc,
    };
  }, missingFixture);

  const fixtureResponse = await fixtureResponsePromise;

  assert.equal(
    fixtureResponse.status(),
    404,
    "Missing-image fixture must return HTTP 404"
  );

  const failedImage = await failure;

  assert.equal(failedImage.complete, true);
  assert.equal(failedImage.naturalWidth, 0);

  assert.equal(
    failedImage.alt,
    "Chris standing up holding his daughter Elva",
    "Readable alternative text must remain when the image fails"
  );

  assert.ok(
    failedImage.currentSrc.includes("__fixtures__"),
    "The failed image must use the missing-image fixture"
  );

  await page.screenshot({
    path: path.join(screenshotDir, "missing-image-fallback.png"),
    fullPage: true,
  });

  // Recovery: restore original source attributes.
  await firstImage.evaluate((img, saved) => {
    const sources = [...img.parentElement.querySelectorAll("source")];

    sources.forEach((source, index) => {
      source.setAttribute("srcset", saved.sources[index].srcset);
      source.setAttribute("media", saved.sources[index].media);
    });

    img.setAttribute("src", saved.src);
  }, original);

  await page.waitForFunction(() => {
    const img = document.querySelector("picture img");

    return (
      img &&
      img.complete &&
      img.naturalWidth > 0 &&
      img.currentSrc.includes("elva-800w.jpg")
    );
  });

  await page.screenshot({
    path: path.join(screenshotDir, "image-recovered.png"),
    fullPage: true,
  });

  // Verify the image-credit link remains intact.
  const credit = page.locator('a[href*="flickr.com"]');

  assert.equal(await credit.count(), 1);

  assert.match(
    await credit.getAttribute("href"),
    /^https:\/\/www\.flickr\.com\//
  );

  assert.match(await credit.innerText(), /Miwok/);

  // No uncaught JavaScript errors should occur.
  assert.deepEqual(
    pageErrors,
    [],
    "There must be no uncaught page errors"
  );

  const report = {
    task: "R18-T042",
    page: pagePath,
    result: "PASS",
    node: process.version,
    playwright: "1.65.0",
    browser: "Chromium (Playwright)",
    checks: [
      "Both original content images load",
      "Meaningful alt text is present",
      "Mobile picture source selected below 800px",
      "Desktop picture source selected at 1000px",
      "Responsive srcset asset selected",
      "Images remain within viewport and use block/max-width layout",
      "Missing-image fixture returns HTTP 404",
      "Alt text remains available after image failure",
      "Restoring original sources recovers the image",
      "Flickr image-credit link remains intact",
      "No uncaught page errors",
    ],
    failure_fixture: {
      path: missingFixture,
      expected_status: 404,
      observed_status: fixtureResponse.status(),
      observed_natural_width: failedImage.naturalWidth,
      observed_alt: failedImage.alt,
    },
    screenshots: [
      "screenshots/mobile-baseline.png",
      "screenshots/desktop-baseline.png",
      "screenshots/missing-image-fallback.png",
      "screenshots/image-recovered.png",
    ],
  };

  await writeFile(
    path.join(evidenceDir, "test-results.json"),
    JSON.stringify(report, null, 2) + "\n"
  );

  console.log("PASS: R18-T042 browser regression checks");

  for (const check of report.checks) {
    console.log(`  ✓ ${check}`);
  }

  console.log(`Evidence: ${evidenceDir}`);
} catch (error) {
  console.error("FAIL: R18-T042 browser regression test");
  console.error(error);
  process.exitCode = 1;
} finally {
  try {
    if (browser) await browser.close();
  } finally {
    if (server.listening) {
      await new Promise((resolve, reject) => {
        server.close(error => {
          if (error) reject(error);
          else resolve();
        });
      });
    }
  }
}
