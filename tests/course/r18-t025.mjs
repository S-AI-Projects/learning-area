import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const files = new Map([
  ["/css/styling-boxes/advanced_box_effects/filters.html", ["text/html; charset=utf-8", "css/styling-boxes/advanced_box_effects/filters.html"]],
  ["/css/styling-boxes/advanced_box_effects/colorful-heart.svg", ["image/svg+xml; charset=utf-8", "css/styling-boxes/advanced_box_effects/colorful-heart.svg"]],
]);
const examples = [
  { className: "blur", caption: "Blur filter", filter: "blur(5px)" },
  { className: "brightness", caption: "Brightness filter", filter: "brightness(0.6)" },
  { className: "shadow", caption: "Drop shadow filter", filter: "drop-shadow(rgba(0, 0, 0, 0.7) 10px 10px 5px)" },
  { className: "gray", caption: "Grayscale filter", filter: "grayscale(1)" },
  { className: "sepia", caption: "Sepia filter", filter: "sepia(1)" },
  { className: "invert", caption: "Inversion filter", filter: "invert(1)" },
  { className: "saturate", caption: "Saturation filter", filter: "saturate(3)" },
  { className: "opacity", caption: "Opacity filter", filter: "opacity(0)" },
  { className: "hue-rotate", caption: "Hue rotation filter", filter: "hue-rotate(210deg)" },
];

const server = createServer(async (request, response) => {
  const file = files.get(new URL(request.url, "http://localhost").pathname);
  if (request.method !== "GET" || !file) {
    response.writeHead(404).end();
    return;
  }

  try {
    const body = await readFile(path.join(root, file[1]));
    response.writeHead(200, {
      "Cache-Control": "no-store",
      "Content-Type": file[0],
    });
    response.end(body);
  } catch (error) {
    console.error(`Unable to serve ${file[1]}:`, error);
    response.writeHead(500).end();
  }
});

let browser;
try {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  assert(address && typeof address === "object");
  const origin = `http://127.0.0.1:${address.port}`;
  const readiness = await fetch(`${origin}/css/styling-boxes/advanced_box_effects/filters.html`);
  assert.equal(readiness.status, 200, "local example server is ready");

  browser = await chromium.launch({ headless: true });

  async function checkFreshContext() {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 1,
      locale: "en-US",
      reducedMotion: "reduce",
    });
    const pageErrors = [];
    const failedRequests = [];
    const externalRequests = [];
    context.on("page", (page) => page.on("pageerror", (error) => pageErrors.push(error.message)));
    context.on("requestfailed", (request) => failedRequests.push(request.url()));
    await context.route("**/*", async (route) => {
      const requestUrl = new URL(route.request().url());
      if (requestUrl.origin !== origin) {
        externalRequests.push(route.request().url());
        await route.abort();
        return;
      }
      await route.continue();
    });

    try {
      const page = await context.newPage();
      const response = await page.goto(`${origin}/css/styling-boxes/advanced_box_effects/filters.html`, { waitUntil: "load" });
      assert.equal(response.status(), 200);
      await page.addStyleTag({
        content: "html { font-family: Arial, sans-serif !important; } figure { transition: none !important; }",
      });
      await page.evaluate(() => document.fonts.ready);
      await page.locator("img").evaluateAll((images) => Promise.all(images.map((image) => image.decode())));

      const initialState = await page.evaluate(() => ({
        title: document.title,
        font: getComputedStyle(document.documentElement).fontFamily,
        figures: [...document.querySelectorAll("figure")].map((figure) => {
          const image = figure.querySelector("img");
          const rect = figure.getBoundingClientRect();
          return {
            className: figure.className,
            caption: figure.querySelector("figcaption").textContent.trim(),
            alt: image.alt,
            imagePath: new URL(image.src).pathname,
            naturalWidth: image.naturalWidth,
            naturalHeight: image.naturalHeight,
            width: rect.width,
            height: rect.height,
            top: rect.top,
            filter: getComputedStyle(figure).filter,
          };
        }),
      }));

      assert.equal(initialState.title, "CSS filters examples");
      assert.equal(initialState.font, "Arial, sans-serif");
      assert.deepEqual(
        initialState.figures.map(({ className, caption }) => ({ className, caption })),
        examples.map(({ className, caption }) => ({ className, caption })),
      );
      for (const figure of initialState.figures) {
        assert.equal(figure.alt, "a colorful prism heart");
        assert.equal(figure.imagePath, "/css/styling-boxes/advanced_box_effects/colorful-heart.svg");
        assert.equal(figure.naturalWidth, 64);
        assert.equal(figure.naturalHeight, 64);
        assert.equal(figure.width, 64);
        assert.equal(figure.height, 68);
        assert.equal(figure.filter, "none");
      }
      assert.equal(new Set(initialState.figures.map(({ top }) => top)).size, 2, "gallery wraps across two rows at the locked viewport");

      const hoverState = [];
      for (const example of examples) {
        const figure = page.locator(`figure.${example.className}`);
        await figure.locator("img").hover();
        assert.equal(await figure.evaluate((element) => getComputedStyle(element).filter), example.filter);
        assert.equal(
          await page.locator(`figure:not(.${example.className})`).evaluateAll((figures) =>
            figures.every((element) => getComputedStyle(element).filter === "none"),
          ),
          true,
          `${example.className} hover does not filter other examples`,
        );
        hoverState.push({ className: example.className, filter: example.filter });
        await page.mouse.move(0, 0);
        assert.equal(await figure.evaluate((element) => getComputedStyle(element).filter), "none");
      }

      assert.deepEqual(externalRequests, [], "the page makes no requests outside the local fixture server");
      assert.deepEqual(failedRequests, [], "all page and image requests succeed");
      assert.deepEqual(pageErrors, [], "the page raises no uncaught errors");
      return { initialState, hoverState };
    } finally {
      await context.close();
    }
  }

  const first = await checkFreshContext();
  const second = await checkFreshContext();
  assert.deepEqual(second, first, "fresh browser contexts render and behave identically");

  console.log(JSON.stringify({
    result: "PASS",
    node: process.version,
    playwright: (await import("playwright/package.json", { with: { type: "json" } })).default.version,
    chromium: browser.version(),
    viewport: { width: 1280, height: 900 },
    contexts: 2,
    examples: examples.length,
    assertedImage: "64x64 local colorful-heart.svg",
    assertionSummary: "DOM, font, wrapping layout, image load, hover filters, pointer exit, no external/failed requests, and no page errors",
    actual: first,
  }, null, 2));
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  try {
    if (browser) {
      await browser.close();
    }
  } finally {
    if (server.listening) {
      await new Promise((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
      });
    }
  }
}
