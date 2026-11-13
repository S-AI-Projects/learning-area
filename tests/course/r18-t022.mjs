import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { dirname, extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDirectory, "../..");
const exampleDirectory = resolve(
  repositoryRoot,
  "html/multimedia-and-embedding/responsive-images",
);
const evidenceDirectory = resolve(repositoryRoot, "work/R18-T022");
const pagePath =
  "/html/multimedia-and-embedding/responsive-images/responsive.html";
const creditHref = "https://www.flickr.com/photos/miwok/17086751527/";
const mode = process.argv[2] ?? "changed";
assert.ok(["baseline", "changed"].includes(mode), "Use baseline or changed mode");

const viewports = [
  {
    width: 360,
    height: 800,
    pictureImage:
      "/html/multimedia-and-embedding/responsive-images/elva-480w-close-portrait.jpg",
    fairyImage:
      "/html/multimedia-and-embedding/responsive-images/elva-fairy-480w.jpg",
  },
  {
    width: 1280,
    height: 800,
    pictureImage: "/html/multimedia-and-embedding/responsive-images/elva-800w.jpg",
    fairyImage:
      "/html/multimedia-and-embedding/responsive-images/elva-fairy-800w.jpg",
  },
];
const expected = {
  pageTitle: "Responsive HTML images demo",
  horizontalOverflow: false,
  directContentOrder: ["h1", "p", "picture", "p", "img", "p"],
  imageAlts: [
    "Chris standing up holding his daughter Elva",
    "Elva dressed as a fairy",
  ],
  verticalPageScroll: true,
  creditNavigationTitle: "Credit link destination",
};
const input = {
  page: pagePath,
  viewports: viewports.map(({ width, height }) => ({ width, height })),
  deviceScaleFactor: 1,
  browserContext: "fresh context for each viewport",
  linkAction: "focus the Miwok credit link and press Enter; destination is mocked",
};

function createStaticServer() {
  const serverErrors = [];
  const server = createServer(async (request, response) => {
    if (request.method !== "GET") {
      response.writeHead(405).end("Method not allowed");
      return;
    }

    let pathname;
    try {
      pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    } catch (error) {
      response.writeHead(400).end("Invalid request path");
      serverErrors.push(String(error));
      return;
    }

    const relativePath = pathname.slice(1);
    const filePath = resolve(repositoryRoot, relativePath);
    if (
      !pathname.startsWith("/html/multimedia-and-embedding/responsive-images/") ||
      !filePath.startsWith(`${exampleDirectory}${sep}`)
    ) {
      response.writeHead(403).end("Path is outside the example");
      return;
    }

    try {
      const contents = await readFile(filePath);
      const contentType =
        extname(filePath) === ".html" ? "text/html; charset=utf-8" : "image/jpeg";
      response.writeHead(200, { "content-type": contentType }).end(contents);
    } catch (error) {
      if (error.code === "ENOENT") {
        response.writeHead(404).end("Not found");
        return;
      }
      serverErrors.push(String(error));
      response.writeHead(500).end("Local server failed to read the example");
    }
  });

  return { server, serverErrors };
}

function round(value) {
  return Math.round(value * 100) / 100;
}

let server;
let browser;
let serverErrors = [];
let browserVersion;
const actual = [];
let testError;

try {
  ({ server, serverErrors } = createStaticServer());
  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });

  const { port } = server.address();
  const pageUrl = `http://127.0.0.1:${port}${pagePath}`;
  const readiness = await fetch(pageUrl);
  assert.equal(readiness.status, 200, "The local example server must be ready");
  await readiness.arrayBuffer();

  browser = await chromium.launch();
  browserVersion = browser.version();

  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: input.deviceScaleFactor,
    });
    const page = await context.newPage();
    const pageErrors = [];
    const consoleErrors = [];
    const failedRequests = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("requestfailed", (request) => {
      failedRequests.push(`${request.method()} ${request.url()}: ${request.failure()?.errorText}`);
    });

    try {
      await page.goto(pageUrl, { waitUntil: "networkidle" });
      await page.locator("img").evaluateAll((images) =>
        Promise.all(images.map((image) => image.decode())),
      );
      assert.equal(await page.title(), expected.pageTitle);

      const layout = await page.evaluate(() => {
        const roundMetric = (value) => Math.round(value * 100) / 100;
        const bounds = (element) => {
          const rect = element.getBoundingClientRect();
          return {
            x: roundMetric(rect.x),
            y: roundMetric(rect.y),
            width: roundMetric(rect.width),
            height: roundMetric(rect.height),
            right: roundMetric(rect.right),
            bottom: roundMetric(rect.bottom),
          };
        };
        const section = document.querySelector("main section");
        const images = [...document.images];
        const link = document.querySelector("a");

        return {
          viewport: { width: innerWidth, height: innerHeight },
          document: {
            clientWidth: document.documentElement.clientWidth,
            scrollWidth: document.documentElement.scrollWidth,
            scrollHeight: document.documentElement.scrollHeight,
            scrollY,
          },
          body: bounds(document.body),
          header: bounds(document.querySelector("header")),
          main: bounds(document.querySelector("main")),
          section: bounds(section),
          contentOrder: [...section.children].map((element) =>
            element.tagName.toLowerCase(),
          ),
          images: images.map((image) => ({
            alt: image.alt,
            currentSrc: new URL(image.currentSrc).pathname,
            complete: image.complete,
            naturalWidth: image.naturalWidth,
            bounds: bounds(image),
            maxWidth: getComputedStyle(image).maxWidth,
          })),
          link: {
            text: link.textContent.trim(),
            href: link.href,
            tabIndex: link.tabIndex,
          },
        };
      });

      assert.equal(layout.viewport.width, viewport.width);
      assert.equal(layout.viewport.height, viewport.height);
      assert.equal(layout.document.clientWidth, viewport.width);
      assert.equal(layout.document.scrollWidth, viewport.width, "No horizontal page overflow");
      assert.equal(
        layout.document.scrollWidth > layout.document.clientWidth,
        expected.horizontalOverflow,
      );
      assert.equal(
        layout.document.scrollHeight > viewport.height,
        expected.verticalPageScroll,
        "The example retains normal vertical scrolling",
      );
      assert.deepEqual(layout.contentOrder, expected.directContentOrder);
      assert.deepEqual(
        layout.images.map((image) => image.alt),
        expected.imageAlts,
      );
      assert.deepEqual(
        layout.images.map((image) => image.currentSrc),
        [viewport.pictureImage, viewport.fairyImage],
      );
      for (const image of layout.images) {
        assert.ok(image.complete && image.naturalWidth > 0, `${image.alt} must load`);
        assert.equal(image.maxWidth, "100%");
        assert.ok(image.bounds.x >= layout.section.x);
        assert.ok(image.bounds.right <= layout.section.right);
      }
      for (const region of [layout.body, layout.header, layout.main, layout.section]) {
        assert.ok(region.x >= 0 && region.right <= viewport.width, "Main regions must fit the viewport");
      }

      const screenshotPath = resolve(
        evidenceDirectory,
        `${mode}-${viewport.width}.png`,
      );
      await mkdir(evidenceDirectory, { recursive: true });
      await page.screenshot({ path: screenshotPath, fullPage: true });

      await page.route(creditHref, (route) =>
        route.fulfill({
          status: 200,
          contentType: "text/html",
          body: `<!doctype html><title>${expected.creditNavigationTitle}</title>`,
        }),
      );
      const creditLink = page.getByRole("link", { name: "Miwok" });
      await creditLink.scrollIntoViewIfNeeded();
      const linkBounds = await creditLink.boundingBox();
      assert.ok(linkBounds, "The credit link must have rendered bounds");
      assert.ok(linkBounds.x >= 0 && linkBounds.x + linkBounds.width <= viewport.width);
      assert.ok(linkBounds.y >= 0 && linkBounds.y + linkBounds.height <= viewport.height);
      assert.equal(await creditLink.getAttribute("href"), creditHref);
      assert.equal(await creditLink.evaluate((link) => link.tabIndex), 0);
      await creditLink.focus();
      assert.equal(await creditLink.evaluate((link) => link === document.activeElement), true);

      await Promise.all([
        page.waitForURL(creditHref),
        page.keyboard.press("Enter"),
      ]);
      assert.equal(await page.title(), expected.creditNavigationTitle);
      assert.deepEqual(pageErrors, [], "Unexpected page errors");
      assert.deepEqual(consoleErrors, [], "Unexpected browser console errors");
      assert.deepEqual(failedRequests, [], "Unexpected failed browser requests");
      assert.deepEqual(serverErrors, [], "Unexpected local server errors");

      actual.push({
        viewport: layout.viewport,
        document: layout.document,
        horizontalOverflow:
          layout.document.scrollWidth > layout.document.clientWidth,
        verticalPageScroll: layout.document.scrollHeight > viewport.height,
        bounds: {
          body: layout.body,
          header: layout.header,
          main: layout.main,
          section: layout.section,
          images: layout.images.map(({ alt, bounds }) => ({ alt, bounds })),
        },
        contentOrder: layout.contentOrder,
        images: layout.images.map(({ alt, currentSrc, complete, naturalWidth }) => ({
          alt,
          currentSrc,
          complete,
          naturalWidth,
        })),
        creditLink: {
          ...layout.link,
          bounds: {
            x: round(linkBounds.x),
            y: round(linkBounds.y),
            width: round(linkBounds.width),
            height: round(linkBounds.height),
          },
          focusedWithKeyboard: true,
          navigatedToMockedDestination: await page.title() === expected.creditNavigationTitle,
        },
        pageErrors,
        consoleErrors,
        failedRequests,
        screenshot: `work/R18-T022/${mode}-${viewport.width}.png`,
      });
    } finally {
      await context.close();
    }
  }
} catch (error) {
  testError = error;
} finally {
  try {
    if (browser) await browser.close();
  } finally {
    if (server?.listening) {
      await new Promise((resolveClose, rejectClose) =>
        server.close((error) => (error ? rejectClose(error) : resolveClose())),
      );
    }
  }

  const playwrightPackage = JSON.parse(
    await readFile(
      resolve(scriptDirectory, "../node_modules/playwright/package.json"),
      "utf8",
    ),
  );
  await mkdir(evidenceDirectory, { recursive: true });
  await writeFile(
    resolve(evidenceDirectory, `${mode}.json`),
    `${JSON.stringify(
      {
        mode,
        outcome: testError ? "failed" : "passed",
        tools: {
          node: process.version,
          playwright: playwrightPackage.version,
          chromium: browserVersion ?? null,
          platform: `${process.platform}-${process.arch}`,
        },
        input,
        expected,
        actual,
        error: testError
          ? { name: testError.name, message: testError.message }
          : null,
      },
      null,
      2,
    )}\n`,
  );
}

if (testError) throw testError;
console.log(`Responsive image regression passed (${mode}); evidence: work/R18-T022/${mode}.json`);
