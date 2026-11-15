import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const targetPath = "accessibility/assessment-start/assessment-files/index.html";
const sourcePath = path.join(root, targetPath);
const evidenceDir = path.join(root, "work/R18-T052");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg"
};

let server;
let browser;

const serverFactory = (mutation = null) => {
  return http.createServer((req, res) => {
    try {
      const url = new URL(req.url, "http://127.0.0.1");
      const relativePath = decodeURIComponent(url.pathname).replace(/^\//, "");
      const filePath = path.resolve(root, relativePath);

      if (!filePath.startsWith(root + path.sep)) {
        res.writeHead(403);
        return res.end("Forbidden");
      }

      if (!fs.existsSync(filePath)) {
        res.writeHead(404);
        return res.end("Not found");
      }

      const ext = path.extname(filePath);
      const stat = fs.statSync(filePath);

      if (mutation === "overflow" && ext === ".css") {
        let css = fs.readFileSync(filePath, "utf8");
        css += "\nbody { min-width: 1600px !important; }\n";
        res.writeHead(200, {
          "Content-Type": "text/css; charset=utf-8",
          "Content-Length": Buffer.byteLength(css)
        });
        return res.end(css);
      }

      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
        const chunksize = end - start + 1;
        const stream = fs.createReadStream(filePath, { start, end });
        res.writeHead(206, {
          "Content-Range": `bytes ${start}-${end}/${stat.size}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunksize,
          "Content-Type": mimeTypes[ext] || "application/octet-stream"
        });
        return stream.pipe(res);
      }

      res.writeHead(200, {
        "Content-Length": stat.size,
        "Accept-Ranges": "bytes",
        "Content-Type": mimeTypes[ext] || "application/octet-stream"
      });
      fs.createReadStream(filePath).pipe(res);
    } catch {
      res.writeHead(500);
      res.end("Server error");
    }
  });
};

async function testViewport(page, viewport) {
  const browserErrors = [];
  page.on("pageerror", err => browserErrors.push(`Page error: ${err.message}`));
  page.on("console", msg => {
    if (msg.type() === "error") browserErrors.push(`Console error: ${msg.text()}`);
  });
  page.on("requestfailed", req => {
    const errorText = req.failure()?.errorText || "";
    if (errorText !== "net::ERR_ABORTED") {
      browserErrors.push(`Request failed: ${req.url()} (${errorText})`);
    }
  });

  const port = server.address().port;
  const response = await page.goto(`http://127.0.0.1:${port}/${targetPath}`, {
    waitUntil: "networkidle"
  });

  assert.equal(response.status(), 200, `Page should load with HTTP 200 at ${viewport.width}x${viewport.height}`);

  // 1. Check for horizontal overflow
  const dimensions = await page.evaluate(() => {
    return {
      docScrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      vpWidth: window.innerWidth,
      vpHeight: window.innerHeight
    };
  });

  assert.ok(
    dimensions.docScrollWidth <= viewport.width,
    `Unintended horizontal overflow at ${viewport.width}px: document is ${dimensions.docScrollWidth}px wide`
  );
  assert.ok(
    dimensions.bodyScrollWidth <= viewport.width,
    `Unintended horizontal overflow at ${viewport.width}px: body is ${dimensions.bodyScrollWidth}px wide`
  );
  console.log(`PASS: No horizontal overflow at ${viewport.width}x${viewport.height}`);

  // 2. Check content order: article precedes secondary related content
  const contentOrder = await page.evaluate(() => {
    const article = document.querySelector("article");
    const secondary = document.querySelector(".secondary");
    const articleRect = article.getBoundingClientRect();
    const secondaryRect = secondary.getBoundingClientRect();
    const followsInDom = (article.compareDocumentPosition(secondary) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;

    return {
      followsInDom,
      articleTop: articleRect.top,
      secondaryTop: secondaryRect.top
    };
  });

  assert.equal(contentOrder.followsInDom, true, "Article must precede .secondary in DOM order");
  if (viewport.width <= 768) {
    assert.ok(
      contentOrder.articleTop <= contentOrder.secondaryTop,
      "On mobile viewport, article content must appear above .secondary related content"
    );
  }
  console.log(`PASS: Content order preserved at ${viewport.width}x${viewport.height}`);

  // 3. Check intentional, labelled scrollable table region
  const tableContainer = page.locator(".table-container");
  assert.equal(await tableContainer.count(), 1, ".table-container must exist");
  assert.equal(await tableContainer.getAttribute("role"), "region", ".table-container must have role='region'");
  assert.equal(await tableContainer.getAttribute("tabindex"), "0", ".table-container must have tabindex='0'");
  assert.notEqual(await tableContainer.getAttribute("aria-label"), null, ".table-container must have an accessible aria-label");
  console.log(`PASS: Intentional scrollable table region verified at ${viewport.width}x${viewport.height}`);

  // 4. Check media constraints (images, audio) do not clip or overflow viewport
  const mediaMetrics = await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll("img")).map(img => {
      const r = img.getBoundingClientRect();
      return { right: r.right, width: r.width };
    });
    const audio = document.querySelector("audio");
    const audioRect = audio ? audio.getBoundingClientRect() : null;
    return { images, audioRect };
  });

  for (const img of mediaMetrics.images) {
    assert.ok(img.right <= viewport.width + 1, `Image width ${img.width}px exceeds viewport bounds`);
  }
  if (mediaMetrics.audioRect) {
    assert.ok(mediaMetrics.audioRect.right <= viewport.width + 1, `Audio control exceeds viewport bounds`);
  }
  console.log(`PASS: Media elements within viewport bounds at ${viewport.width}x${viewport.height}`);

  // 5. Open comments and check source anchors #name and #comment
  const showHide = page.locator(".show-hide");
  assert.equal(await showHide.count(), 1, ".show-hide toggle must exist");
  await showHide.click();

  const nameInput = page.locator("#name");
  const commentInput = page.locator("#comment");
  assert.equal(await nameInput.count(), 1, "#name control must exist");
  assert.equal(await commentInput.count(), 1, "#comment control must exist");
  assert.equal(await nameInput.isVisible(), true, "#name must be visible after opening comments");
  assert.equal(await commentInput.isVisible(), true, "#comment must be visible after opening comments");

  const controlBounds = await page.evaluate(() => {
    const nameEl = document.querySelector("#name");
    const commentEl = document.querySelector("#comment");
    const nr = nameEl.getBoundingClientRect();
    const cr = commentEl.getBoundingClientRect();
    return {
      name: { x: nr.x, right: nr.right, width: nr.width, height: nr.height },
      comment: { x: cr.x, right: cr.right, width: cr.width, height: cr.height }
    };
  });

  assert.ok(controlBounds.name.x >= 0, "#name must not clip on the left");
  assert.ok(controlBounds.name.right <= viewport.width + 1, `#name must not clip on the right (${controlBounds.name.right} > ${viewport.width})`);
  assert.ok(controlBounds.name.width > 50, "#name must have usable width");

  assert.ok(controlBounds.comment.x >= 0, "#comment must not clip on the left");
  assert.ok(controlBounds.comment.right <= viewport.width + 1, `#comment must not clip on the right (${controlBounds.comment.right} > ${viewport.width})`);
  assert.ok(controlBounds.comment.width > 50, "#comment must have usable width");
  console.log(`PASS: Source anchors #name and #comment are fully visible and unclipped at ${viewport.width}x${viewport.height}`);

  // 6. Test interaction: Form submission operates properly at this viewport
  const testName = `User ${viewport.width}`;
  const testComment = `Testing comment submission at ${viewport.width}x${viewport.height}`;

  await nameInput.fill(testName);
  await commentInput.fill(testComment);
  await page.locator('.comment-form input[type="submit"]').click();

  const commentItems = page.locator(".comment-container li");
  const lastComment = commentItems.last();
  const lastCommentText = await lastComment.innerText();

  assert.ok(lastCommentText.includes(testName), "Comment container must contain submitted name");
  assert.ok(lastCommentText.includes(testComment), "Comment container must contain submitted comment");
  assert.equal(await nameInput.inputValue(), "", "#name input must be cleared after submission");
  assert.equal(await commentInput.inputValue(), "", "#comment input must be cleared after submission");
  console.log(`PASS: Comment submission succeeds and updates DOM at ${viewport.width}x${viewport.height}`);

  // 7. Verify no unexpected page errors
  assert.deepEqual(browserErrors, [], `Unexpected browser errors at ${viewport.width}x${viewport.height}`);
  console.log(`PASS: No console or page errors at ${viewport.width}x${viewport.height}`);

  // Save screenshot evidence
  fs.mkdirSync(evidenceDir, { recursive: true });
  await page.screenshot({
    path: path.join(evidenceDir, `verified-${viewport.width}x${viewport.height}.png`),
    fullPage: true
  });

  return {
    viewport,
    dimensions,
    controlBounds,
    status: "PASS"
  };
}

try {
  server = serverFactory();
  await new Promise((res, rej) => {
    server.once("error", rej);
    server.listen(0, "127.0.0.1", res);
  });

  browser = await chromium.launch({ headless: true });
  const viewports = [
    { width: 360, height: 800 },
    { width: 1280, height: 800 }
  ];

  const results = [];
  for (const vp of viewports) {
    const context = await browser.newContext({ viewport: vp });
    try {
      const page = await context.newPage();
      const result = await testViewport(page, vp);
      results.push(result);
    } finally {
      await context.close();
    }
  }

  // 8. Deliberate Mutation Test: Ensure test fails if overflow is present
  console.log("\nRunning deliberate overflow mutation check...");
  const mutationServer = serverFactory("overflow");
  await new Promise((res, rej) => {
    mutationServer.once("error", rej);
    mutationServer.listen(0, "127.0.0.1", res);
  });

  const mutationContext = await browser.newContext({ viewport: { width: 360, height: 800 } });
  let mutationDetected = false;
  try {
    const mutationPage = await mutationContext.newPage();
    const port = mutationServer.address().port;
    await mutationPage.goto(`http://127.0.0.1:${port}/${targetPath}`, { waitUntil: "networkidle" });
    const scrollWidth = await mutationPage.evaluate(() => document.documentElement.scrollWidth);
    assert.ok(scrollWidth <= 360, `Expected overflow assertion triggered (width=${scrollWidth}px)`);
  } catch (err) {
    if (err.message.includes("overflow") || err.name === "AssertionError") {
      mutationDetected = true;
      console.log("PASS: Mutation test confirmed layout check fails when horizontal overflow occurs.");
    } else {
      throw err;
    }
  } finally {
    await mutationContext.close();
    await new Promise(r => mutationServer.close(r));
  }

  assert.equal(mutationDetected, true, "Regression check must fail on deliberate overflow mutation");

  console.log("\nAll R18-T052 responsive layout checks passed successfully.");
} catch (error) {
  console.error("\nR18-T052 FAILED:", error);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server?.listening) {
    await new Promise(r => server.close(r));
  }
}
