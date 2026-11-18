
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const html = await readFile(
  join(root, "html/forms/your-first-HTML-form/first-form.html"),
  "utf8"
);

const submissions = [];
const server = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/first-form.html") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  if (req.method === "POST" && req.url === "/my-handling-form-page") {
    let body = "";
    for await (const chunk of req) body += chunk;

    const data = Object.fromEntries(new URLSearchParams(body));
    submissions.push(data);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ received: data }));
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

let browser;

try {
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}`;

  browser = await chromium.launch({ headless: true });

  let baseline;

  for (let run = 1; run <= 2; run++) {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1
    });

    try {
      // Keep every browser request inside the local test server.
      await context.route("**/*", (route) => {
        const url = new URL(route.request().url());

        if (url.origin === baseUrl) {
          return route.continue();
        }

        return route.abort();
      });

      const page = await context.newPage();
      const pageErrors = [];
      page.on("pageerror", (error) => pageErrors.push(error));

      await page.goto(`${baseUrl}/first-form.html`);

      // Lock the font fixture for consistent layout checks.
      await page.addStyleTag({
        content: `
          body, input, textarea, button {
            font-family: Arial, sans-serif !important;
          }
        `
      });

      const snapshot = await page.evaluate(() => {
        const name = document.querySelector("#name");
        const mail = document.querySelector("#mail");
        const message = document.querySelector("#msg");
        const rect = name.getBoundingClientRect();

        return {
          forms: document.querySelectorAll("form").length,
          inputs: document.querySelectorAll("input").length,
          textareas: document.querySelectorAll("textarea").length,
          labels: [...document.querySelectorAll("label")].map(
            (label) => label.htmlFor
          ),
          nameType: name.type,
          mailType: mail.type,
          messageTag: message.tagName,
          action: document.querySelector("form").getAttribute("action"),
          nameWidth: rect.width,
          nameHeight: rect.height,
          fontFamily: getComputedStyle(name).fontFamily
        };
      });

      assert.equal(snapshot.forms, 1);
      assert.equal(snapshot.inputs, 2);
      assert.equal(snapshot.textareas, 1);
      assert.deepEqual(snapshot.labels, ["name", "mail", "msg"]);
      assert.equal(snapshot.nameType, "text");
      assert.equal(snapshot.mailType, "email");
      assert.equal(snapshot.messageTag, "TEXTAREA");
      assert.equal(snapshot.action, "/my-handling-form-page");
      assert.ok(snapshot.nameWidth > 0);
      assert.ok(snapshot.nameHeight > 0);
      assert.match(snapshot.fontFamily, /Arial/);

      if (baseline === undefined) {
        baseline = snapshot;
      } else {
        assert.deepEqual(snapshot, baseline);
      }

      // Check native email validation.
      await page.locator("#mail").fill("invalid-email");
      assert.equal(
        await page.locator("#mail").evaluate((el) => el.checkValidity()),
        false
      );

      const submissionCount = submissions.length;

      await page.evaluate(() => {
        window.inputEvents = { name: 0, mail: 0, msg: 0 };
      
        for (const id of ["name", "mail", "msg"]) {
          document.querySelector(`#${id}`).addEventListener("input", () => {
            window.inputEvents[id]++;
          });
        }
      });
      
      await page.locator("#name").fill("Test User");
      await page.locator("#mail").fill("test@example.com");
      await page.locator("#msg").fill("Deterministic form test");

      assert.deepEqual(await page.evaluate(() => window.inputEvents), { name: 1, mail: 1, msg: 1 });

      const [response] = await Promise.all([
        page.waitForResponse(
          (response) =>
            response.url() === `${baseUrl}/my-handling-form-page` &&
            response.request().method() === "POST"
        ),
        page.locator('button[type="submit"]').click()
      ]);

      assert.equal(response.status(), 200);
      assert.equal(submissions.length, submissionCount + 1);

      assert.deepEqual(submissions.at(-1), {
        user_name: "Test User",
        user_mail: "test@example.com",
        user_message: "Deterministic form test"
      });

      assert.deepEqual(await response.json(), {
        received: {
          user_name: "Test User",
          user_mail: "test@example.com",
          user_message: "Deterministic form test"
        }
      });

      assert.deepEqual(pageErrors, []);

      console.log(`PASS: Browser context ${run} produced the expected DOM, layout and form submission.`);
    } finally {
      await context.close();
    }
  }

  assert.equal(submissions.length, 2);
  console.log("PASS: Two fresh contexts produced identical baseline DOM and layout.");
  console.log("PASS: Form submissions used only the local test server.");
  console.log("PASS: No unexpected browser errors.");
} catch (error) {
  console.error("FAIL:", error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();

  if (server.listening) {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }
}
