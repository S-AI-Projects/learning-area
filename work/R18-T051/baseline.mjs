import { chromium } from "playwright";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";

const root = process.cwd();
const port = 4180;
const target = "/css/css-layout/practical-positioning-examples/fixed-info-box.html";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, "http://127.0.0.1").pathname;
    const file = resolve(root, "." + pathname);
    if (!file.startsWith(root + sep)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    const content = await readFile(file);
    res.writeHead(200, { "Content-Type": mimeTypes[extname(file)] || "application/octet-stream" });
    res.end(content);
  } catch (err) {
    res.writeHead(404);
    res.end("Not found");
  }
});

let browser;

try {
  await new Promise((res, rej) => {
    server.once("error", rej);
    server.listen(port, "127.0.0.1", res);
  });

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("pageerror", err => console.log("PAGE ERROR:", err));
  page.on("console", msg => console.log("CONSOLE:", msg.type(), msg.text()));

  await page.goto(`http://127.0.0.1:${port}${target}`, { waitUntil: "networkidle" });

  console.log("Page title:", await page.title());

  // Check initial DOM state
  const tab1 = page.locator("#tab-1");
  const tab2 = page.locator("#tab-2");
  const tab3 = page.locator("#tab-3");
  const panel1 = page.locator("#tabpanel-1");
  const panel2 = page.locator("#tabpanel-2");
  const panel3 = page.locator("#tabpanel-3");

  console.log("tab-1 attrs:", await tab1.evaluate(el => ({
    tabIndex: el.tabIndex,
    ariaSelected: el.getAttribute("aria-selected"),
    ariaControls: el.getAttribute("aria-controls"),
    hasAttributeTabIndex: el.hasAttribute("tabindex")
  })));

  console.log("tab-2 attrs:", await tab2.evaluate(el => ({
    tabIndex: el.tabIndex,
    ariaSelected: el.getAttribute("aria-selected"),
    hasAttributeTabIndex: el.hasAttribute("tabindex")
  })));

  console.log("panel-1 visible:", await panel1.isVisible());
  console.log("panel-2 visible:", await panel2.isVisible());
  console.log("panel-3 visible:", await panel3.isVisible());
  console.log("panel-1 tabIndex:", await panel1.evaluate(el => ({
    tabIndex: el.tabIndex,
    hasAttributeTabIndex: el.hasAttribute("tabindex")
  })));

  // Test Tab key navigation
  await page.keyboard.press("Tab");
  console.log("Active element after 1st Tab:", await page.evaluate(() => document.activeElement?.id));

  // Check visible focus on tab-1
  const tab1FocusVisible = await tab1.evaluate(el => {
    const span = el.querySelector("span");
    const style = window.getComputedStyle(span);
    return {
      outline: style.outline,
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor
    };
  });
  console.log("tab-1 focus outline:", tab1FocusVisible);

  // Press ArrowRight
  await page.keyboard.press("ArrowRight");
  console.log("Active element after ArrowRight:", await page.evaluate(() => document.activeElement?.id));
  console.log("tab-2 ariaSelected after ArrowRight (before Enter/Space):", await tab2.getAttribute("aria-selected"));

  // Press Enter to activate tab-2
  await page.keyboard.press("Enter");
  console.log("tab-2 ariaSelected after Enter:", await tab2.getAttribute("aria-selected"));
  console.log("panel-2 visible after Enter:", await panel2.isVisible());
  console.log("panel-1 visible after Enter:", await panel1.isVisible());

  // Press ArrowRight to tab-3, then Space to activate
  await page.keyboard.press("ArrowRight");
  console.log("Active element after second ArrowRight:", await page.evaluate(() => document.activeElement?.id));
  await page.keyboard.press("Space");
  console.log("tab-3 ariaSelected after Space:", await tab3.getAttribute("aria-selected"));
  console.log("panel-3 visible after Space:", await panel3.isVisible());

  // Test wrapping: ArrowRight from tab-3 wraps to tab-1
  await page.keyboard.press("ArrowRight");
  console.log("Active element after ArrowRight from tab-3:", await page.evaluate(() => document.activeElement?.id));

  // Test ArrowLeft wrapping: ArrowLeft from tab-1 wraps to tab-3
  await page.keyboard.press("ArrowLeft");
  console.log("Active element after ArrowLeft from tab-1:", await page.evaluate(() => document.activeElement?.id));

  // Test Home key
  await page.keyboard.press("Home");
  console.log("Active element after Home:", await page.evaluate(() => document.activeElement?.id));

  // Test End key
  await page.keyboard.press("End");
  console.log("Active element after End:", await page.evaluate(() => document.activeElement?.id));

  // Now press Enter on tab-1 to re-select tab-1
  await page.keyboard.press("Home");
  await page.keyboard.press("Enter");
  console.log("Re-selected tab-1. Now pressing Tab to see if panel-1 is reached:");
  await page.keyboard.press("Tab");
  console.log("Active element after pressing Tab from tab-1:", await page.evaluate(() => ({
    id: document.activeElement?.id,
    tag: document.activeElement?.tagName
  })));

  await context.close();
} catch (err) {
  console.error("Baseline error:", err);
} finally {
  if (browser) await browser.close();
  await new Promise(r => server.close(r));
}
