import { chromium } from "playwright";
import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const target = "/accessibility/assessment-start/assessment-files/index.html";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".mp3": "audio/mpeg",
  ".ogg": "audio/ogg"
};

const server = http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, "http://127.0.0.1").pathname;
    const file = path.resolve(root, "." + pathname);
    const content = await fs.readFile(file);
    res.writeHead(200, { "Content-Type": mimeTypes[path.extname(file)] || "application/octet-stream" });
    res.end(content);
  } catch (err) {
    res.writeHead(404);
    res.end("Not found");
  }
});

await new Promise(r => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

const browser = await chromium.launch({ headless: true });

for (const viewport of [{ width: 360, height: 800 }, { width: 1280, height: 800 }]) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();

  await page.goto(`http://127.0.0.1:${port}${target}`, { waitUntil: "networkidle" });

  // Open the comments section to inspect #name and #comment
  const showHide = page.locator(".show-hide");
  if (await showHide.count() > 0) {
    await showHide.click();
  }

  const metrics = await page.evaluate(() => {
    const docWidth = document.documentElement.scrollWidth;
    const bodyWidth = document.body.scrollWidth;
    const vpWidth = window.innerWidth;

    const nameEl = document.querySelector("#name");
    const commentEl = document.querySelector("#comment");
    const nameRect = nameEl ? nameEl.getBoundingClientRect() : null;
    const commentRect = commentEl ? commentEl.getBoundingClientRect() : null;

    // Check images
    const images = Array.from(document.querySelectorAll("img")).map(img => {
      const r = img.getBoundingClientRect();
      return { src: img.src, width: r.width, right: r.right };
    });

    // Check audio
    const audio = document.querySelector("audio");
    const audioRect = audio ? audio.getBoundingClientRect() : null;

    // Check table
    const table = document.querySelector("table");
    const tableRect = table ? table.getBoundingClientRect() : null;

    return {
      vpWidth,
      docWidth,
      bodyWidth,
      hasOverflow: docWidth > vpWidth,
      overflowAmount: Math.max(0, docWidth - vpWidth),
      nameRect,
      commentRect,
      audioRect,
      tableRect,
      images
    };
  });

  console.log(`\n--- Viewport: ${viewport.width}x${viewport.height} ---`);
  console.log(`Document scrollWidth: ${metrics.docWidth}px (Viewport: ${metrics.vpWidth}px)`);
  console.log(`Has horizontal overflow: ${metrics.hasOverflow} (amount: ${metrics.overflowAmount}px)`);
  console.log(`Name input rect:`, metrics.nameRect);
  console.log(`Comment input rect:`, metrics.commentRect);
  console.log(`Audio rect:`, metrics.audioRect);
  console.log(`Table rect:`, metrics.tableRect);
  console.log(`Images:`, metrics.images);

  await page.screenshot({
    path: `work/R18-T052/baseline-${viewport.width}x${viewport.height}.png`,
    fullPage: true
  });

  await context.close();
}

await browser.close();
server.close();

