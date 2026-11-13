import assert from "node:assert/strict";
import { createServer } from "node:http";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const playwrightVersion = require("playwright/package.json").version;
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const exampleRoot = path.join(
  repoRoot,
  "javascript/apis/third-party-apis/youtube",
);
const evidenceRoot = path.join(repoRoot, "work/R18-T027");
const contentTypes = {
  ".css": "text/css",
  ".html": "text/html",
  ".js": "text/javascript",
};

const server = createServer(async (request, response) => {
  const pathname = new URL(request.url, "http://127.0.0.1").pathname;
  const filePath = path.resolve(exampleRoot, `.${pathname}`);

  if (!filePath.startsWith(`${exampleRoot}${path.sep}`)) {
    response.writeHead(403).end();
    return;
  }

  try {
    const contents = await readFile(filePath);
    response.writeHead(200, {
      "content-type":
        contentTypes[path.extname(filePath)] ?? "application/octet-stream",
    });
    response.end(contents);
  } catch (error) {
    if (error.code !== "ENOENT") {
      response.writeHead(500).end();
      throw error;
    }
    response.writeHead(404).end();
  }
});

let browser;
let context;

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const readiness = await fetch(`${baseUrl}/index.html`);
  assert.equal(readiness.status, 200, "local example server is ready");
  assert.match(await readiness.text(), /YouTube video search/);

  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({
    viewport: { width: 1200, height: 900 },
  });
  const page = await context.newPage();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.addInitScript(() => {
    window.__youtubeTest = { apiCalls: [], playerCalls: [] };
    window.gapi = {
      client: {
        load: (api, version, callback) => {
          window.__youtubeTest.loadedApi = { api, version };
          callback();
        },
        setApiKey: (key) => {
          window.__youtubeTest.apiKey = key;
        },
        youtube: {
          search: {
            list: (params) => ({
              execute: (callback) => {
                window.__youtubeTest.apiCalls.push(params);
                const ids =
                  params.q === "space flight"
                    ? ["flight-one", "flight-two"]
                    : ["orbit-one"];
                callback({
                  items: ids.map((videoId) => ({ id: { videoId } })),
                });
              },
            }),
          },
        },
      },
    };
    window.YT = {
      Player: function (id, options) {
        window.__youtubeTest.playerCalls.push({
          id,
          videoId: options.videoId,
          width: options.width,
          height: options.height,
        });
        const iframe = document.createElement("iframe");
        iframe.id = id;
        iframe.title = `Video ${options.videoId}`;
        iframe.width = options.width;
        iframe.height = options.height;
        iframe.src = `https://www.youtube.com/embed/${options.videoId}`;
        document.getElementById(id).replaceWith(iframe);
        options.events.onReady({
          target: {
            id,
            a: iframe,
            getDuration: () => 120,
          },
        });
      },
    };
  });

  await page.route("https://apis.google.com/**", (route) => route.abort());
  await page.route("https://www.youtube.com/**", (route) => route.abort());
  await page.goto(`${baseUrl}/index.html`);

  const entryPoint = {
    title: await page.title(),
    searchVisible: await page.locator("#search").isVisible(),
    searchRequired: await page.locator("#search").evaluate((input) => input.required),
    label: (await page.locator('label[for="search"]').innerText()).trim(),
  };
  const apiInitialization = await page.evaluate(
    () => window.__youtubeTest.loadedApi,
  );
  assert.deepEqual(entryPoint, {
    title: "YouTube APIs example",
    searchVisible: true,
    searchRequired: true,
    label: "Enter a search term (required):",
  });
  assert.deepEqual(apiInitialization, { api: "youtube", version: "v3" });

  const layout = await page.evaluate(() => {
    const bounds = (selector) => {
      const { x, width, height } = document
        .querySelector(selector)
        .getBoundingClientRect();
      return { x, width, height };
    };
    return {
      bodyWidth: document.body.getBoundingClientRect().width,
      viewportWidth: window.innerWidth,
      wrapper: bounds(".wrapper"),
      controls: bounds(".controls"),
      results: bounds(".results"),
    };
  });
  assert.ok(
    Math.abs(layout.wrapper.width - layout.bodyWidth * 0.8) < 1,
    "wrapper occupies 80% of the body width",
  );
  assert.ok(
    Math.abs(layout.wrapper.x + layout.wrapper.width / 2 - layout.viewportWidth / 2) < 1,
    "wrapper is centered",
  );
  assert.ok(
    Math.abs(layout.controls.width - layout.results.width) < 1,
    "search and results columns are equal width",
  );
  assert.ok(
    Math.abs(layout.controls.width + layout.results.width - layout.wrapper.width) < 1,
    "columns fill the wrapper",
  );
  assert.ok(layout.controls.x < layout.results.x, "search precedes results");

  await page.locator(".submit").click();
  const emptySubmit = {
    invalid: await page
      .locator("#search")
      .evaluate((input) => input.validity.valueMissing),
    apiCalls: await page.evaluate(() => window.__youtubeTest.apiCalls),
  };
  assert.deepEqual(emptySubmit, { invalid: true, apiCalls: [] });

  await page.locator("#search").fill("space flight");
  await page.locator(".submit").click();
  const firstSearch = await page.evaluate(() => ({
    apiCalls: window.__youtubeTest.apiCalls,
    frames: [...document.querySelectorAll(".results section iframe")].map(
      ({ title, src, width, height }) => ({ title, src, width, height }),
    ),
  }));
  assert.deepEqual(firstSearch.apiCalls, [
    { part: "snippet", maxResults: 10, q: "space flight" },
  ]);
  assert.deepEqual(firstSearch.frames, [
    {
      title: "Video flight-one",
      src: "https://www.youtube.com/embed/flight-one",
      width: "480",
      height: "360",
    },
    {
      title: "Video flight-two",
      src: "https://www.youtube.com/embed/flight-two",
      width: "480",
      height: "360",
    },
  ]);

  await page.locator("#search").fill("orbital mechanics");
  await page.locator(".submit").click();
  const replacement = await page.evaluate(() => ({
    apiCalls: window.__youtubeTest.apiCalls,
    frames: [...document.querySelectorAll(".results section iframe")].map(
      ({ title, src, width, height }) => ({ title, src, width, height }),
    ),
  }));
  assert.deepEqual(replacement.apiCalls, [
    { part: "snippet", maxResults: 10, q: "space flight" },
    { part: "snippet", maxResults: 10, q: "orbital mechanics" },
  ]);
  assert.deepEqual(replacement.frames, [
    {
      title: "Video orbit-one",
      src: "https://www.youtube.com/embed/orbit-one",
      width: "480",
      height: "360",
    },
  ]);
  assert.deepEqual(pageErrors, [], "page has no uncaught JavaScript errors");

  await mkdir(evidenceRoot, { recursive: true });
  await page.screenshot({
    path: path.join(evidenceRoot, "after.png"),
    fullPage: true,
  });

  const evidence = {
    task: "R18-T027",
    result: "PASS",
    inputs: {
      viewport: { width: 1200, height: 900 },
      queries: ["", "space flight", "orbital mechanics"],
      mockedResults: {
        "space flight": ["flight-one", "flight-two"],
        "orbital mechanics": ["orbit-one"],
      },
      externalApiRequests: "blocked; deterministic gapi and YT stubs used",
    },
    expected: {
      entryPoint: {
        title: "YouTube APIs example",
        searchVisible: true,
        searchRequired: true,
        label: "Enter a search term (required):",
        apiInitialization: { api: "youtube", version: "v3" },
      },
      emptySubmit: { invalid: true, apiCalls: [] },
      firstSearch: {
        apiCalls: [
          { part: "snippet", maxResults: 10, q: "space flight" },
        ],
        frames: [
          {
            title: "Video flight-one",
            src: "https://www.youtube.com/embed/flight-one",
            width: "480",
            height: "360",
          },
          {
            title: "Video flight-two",
            src: "https://www.youtube.com/embed/flight-two",
            width: "480",
            height: "360",
          },
        ],
      },
      replacement: {
        apiCalls: [
          { part: "snippet", maxResults: 10, q: "space flight" },
          { part: "snippet", maxResults: 10, q: "orbital mechanics" },
        ],
        frames: [
          {
            title: "Video orbit-one",
            src: "https://www.youtube.com/embed/orbit-one",
            width: "480",
            height: "360",
          },
        ],
      },
      layout: {
        wrapperWidth: 947.1875,
        columnWidths: [473.59375, 473.59375],
        centered: true,
      },
      pageErrors: [],
    },
    actual: {
      entryPoint,
      apiInitialization,
      layout,
      emptySubmit,
      firstSearch,
      replacement,
      pageErrors,
    },
    baseline: {
      capturedBeforeChanges: true,
      expected: {
        emptySubmit: { invalid: true, apiCalls: [] },
        searchRequest: {
          part: "snippet",
          maxResults: 10,
          q: "space flight",
        },
        renderedVideoIds: ["video-one", "video-two"],
        wrapperWidth: 947.1875,
        columnWidths: [473.59375, 473.59375],
      },
      actual: {
        emptySubmissionProducedNoApiCall: true,
        searchRequest: {
          part: "snippet",
          maxResults: 10,
          q: "space flight",
        },
        renderedVideoIds: ["video-one", "video-two"],
        wrapperWidth: 947.1875,
        columnWidths: [473.59375, 473.59375],
      },
      screenshot: "baseline.png",
    },
    screenshots: { baseline: "baseline.png", changed: "after.png" },
    toolVersions: {
      node: process.version,
      playwright: playwrightVersion,
      chromium: browser.version(),
    },
  };
  await writeFile(
    path.join(evidenceRoot, "evidence.json"),
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  try {
    if (context) await context.close();
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
