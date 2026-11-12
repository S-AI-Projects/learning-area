import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const exampleDir = path.join(root, "javascript/building-blocks/functions");
const evidenceDir = path.join(root, "work/R18-T048");
const expectedIntentionalError = "Identifier 'name' has already been declared";
const expectedDialog = "Hello Chris: welcome to our company.";

async function availablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const { port } = server.address();
  await new Promise((resolve, reject) =>
    server.close(error => error ? reject(error) : resolve())
  );
  return port;
}

async function waitForServer(url, server) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Local server exited early with code ${server.exitCode}`);
    }
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // The server may still be starting.
    }
    await delay(250);
  }
  throw new Error("Local HTTP server did not become ready in time");
}

let server;
let browser;

try {
  await mkdir(evidenceDir, { recursive: true });

  const port = await availablePort();
  const baseUrl = `http://127.0.0.1:${port}/conflict.html`;

  server = spawn(
    "python3",
    ["-m", "http.server", String(port), "--bind", "127.0.0.1", "--directory", exampleDir],
    { stdio: ["ignore", "ignore", "pipe"] }
  );

  let serverStderr = "";
  server.stderr.setEncoding("utf8");
  server.stderr.on("data", chunk => { serverStderr += chunk; });

  await waitForServer(baseUrl, server);

  browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : {})
  });

  const results = [];

  for (const width of [375, 1280]) {
    for (const reducedMotion of ["no-preference", "reduce"]) {
      const context = await browser.newContext({
        viewport: { width, height: 800 },
        reducedMotion
      });

      try {
        const page = await context.newPage();
        const pageErrors = [];
        const failedRequests = [];
        const badResponses = [];
        const dialogs = [];

        page.on("pageerror", error => pageErrors.push(error.message));
        page.on("requestfailed", request =>
          failedRequests.push(`${request.url()}: ${request.failure()?.errorText}`)
        );
        page.on("response", response => {
          if (response.status() >= 400) {
            badResponses.push(`${response.status()} ${response.url()}`);
          }
        });
        page.on("dialog", async dialog => {
          dialogs.push(dialog.message());
          await dialog.accept();
        });

        const response = await page.goto(baseUrl, { waitUntil: "load" });
        assert.equal(response.status(), 200, "Example page should load successfully");

        await page.keyboard.press("Tab");

        const state = await page.evaluate(() => {
          const paragraph = document.querySelector("body > p");
          const style = paragraph ? getComputedStyle(paragraph) : null;
          const rect = paragraph?.getBoundingClientRect();

          return {
            title: document.title,
            text: document.body.innerText.trim(),
            paragraphCount: document.querySelectorAll("body > p").length,
            tabIndex: paragraph?.getAttribute("tabindex"),
            focused: document.activeElement === paragraph,
            focusVisible: paragraph?.matches(":focus-visible") ?? false,
            outlineStyle: style?.outlineStyle,
            outlineWidth: style?.outlineWidth,
            outlineOffset: style?.outlineOffset,
            display: style?.display,
            visibility: style?.visibility,
            animationName: style?.animationName,
            animationCount: paragraph?.getAnimations().length ?? -1,
            reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
            bounds: rect ? {
              x: rect.x, y: rect.y, width: rect.width, height: rect.height
            } : null,
            documentWidth: document.documentElement.scrollWidth,
            viewportWidth: window.innerWidth
          };
        });

        assert.equal(state.title, "Conflict example");
        assert.equal(state.text, "My body");
        assert.equal(state.paragraphCount, 1);
        assert.equal(state.tabIndex, "0");
        assert.equal(state.focused, true, "Tab should focus the main paragraph");
        assert.equal(state.focusVisible, true, "Keyboard focus indicator must be visible");
        assert.equal(state.outlineStyle, "solid");
        assert.equal(state.outlineWidth, "3px");
        assert.equal(state.outlineOffset, "3px");
        assert.equal(state.display, "block");
        assert.equal(state.visibility, "visible");
        assert.equal(state.animationName, "none", "The example should remain static");
        assert.equal(state.animationCount, 0, "The page should have no running animations");
        assert.equal(state.reducedMotion, reducedMotion === "reduce");
        assert.ok(state.bounds && state.bounds.width > 0 && state.bounds.height > 0);
        assert.ok(
          state.documentWidth <= state.viewportWidth,
          "Content should not overflow the viewport"
        );

        // The duplicate top-level const is the lesson's intentional error.
        assert.deepEqual(pageErrors, [expectedIntentionalError]);
        assert.deepEqual(dialogs, [expectedDialog]);
        assert.deepEqual(failedRequests, []);
        assert.deepEqual(badResponses, []);

        const screenshot = `after-${width}-${reducedMotion}.png`;
        await page.screenshot({
          path: path.join(evidenceDir, screenshot),
          fullPage: true
        });

        results.push({
          width,
          reducedMotion,
          httpStatus: response.status(),
          ...state,
          pageErrors,
          dialogs,
          failedRequests,
          badResponses,
          screenshot
        });
      } finally {
        await context.close();
      }
    }
  }

  const { writeFile } = await import("node:fs/promises");
  const browserVersion = browser.version();

  await writeFile(
    path.join(evidenceDir, "actual-results.json"),
    JSON.stringify({
      outcome: "PASS",
      browser: browserVersion,
      results
    }, null, 2) + "\n"
  );

  console.log("R18-T048: PASS");
  console.log(JSON.stringify(results, null, 2));
} catch (error) {
  console.error("R18-T048: FAIL");
  console.error(error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server && server.exitCode === null) {
    server.kill("SIGTERM");
    await Promise.race([
      new Promise(resolve => server.once("exit", resolve)),
      delay(3000)
    ]);
    if (server.exitCode === null) server.kill("SIGKILL");
  }
}
