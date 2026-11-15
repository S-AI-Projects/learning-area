import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const target = "/css/css-layout/practical-positioning-examples/fixed-info-box.html";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8"
};

let server;
let browser;
let context;

const browserErrors = [];

try {
  // 1. Start local static HTTP server
  server = createServer(async (req, res) => {
    try {
      const pathname = new URL(req.url, "http://127.0.0.1").pathname;
      const file = resolve(root, "." + pathname);
      assert.ok(
        file.startsWith(root + sep),
        "Request must stay inside repository root"
      );
      const content = await readFile(file);
      res.writeHead(200, {
        "Content-Type": mimeTypes[extname(file)] || "application/octet-stream"
      });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });

  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });

  const port = server.address().port;

  // 2. Launch Chromium in headless mode
  browser = await chromium.launch({ headless: true });
  context = await browser.newContext();
  const page = await context.newPage();

  page.on("pageerror", error => {
    browserErrors.push(`Page error: ${error.message}`);
  });

  page.on("console", message => {
    if (message.type() === "error") {
      browserErrors.push(`Console error: ${message.text()}`);
    }
  });

  page.on("requestfailed", request => {
    browserErrors.push(`Request failed: ${request.url()}`);
  });

  // Navigate to target page
  const response = await page.goto(`http://127.0.0.1:${port}${target}`, {
    waitUntil: "networkidle"
  });
  assert.equal(response.status(), 200, "Page should load with HTTP 200");
  console.log("PASS: Page loaded successfully with HTTP 200");

  // 3. Verify CSS fixed positioning layout
  const infoBox = page.locator(".info-box");
  assert.equal(await infoBox.count(), 1, "Page must contain .info-box");
  const layout = await infoBox.evaluate(el => {
    const style = window.getComputedStyle(el);
    return {
      position: style.position,
      width: style.width,
      height: style.height,
      top: style.top
    };
  });
  assert.equal(layout.position, "fixed", ".info-box must have position: fixed");
  assert.equal(layout.width, "452px", ".info-box width must be 452px");
  assert.equal(layout.height, "400px", ".info-box height must be 400px");
  assert.equal(layout.top, "0px", ".info-box top must be 0px");
  console.log("PASS: Preserved CSS fixed positioning layout");

  // 4. Verify initial tablist and tabpanel DOM states
  const tab1 = page.locator("#tab-1");
  const tab2 = page.locator("#tab-2");
  const tab3 = page.locator("#tab-3");
  const panel1 = page.locator("#tabpanel-1");
  const panel2 = page.locator("#tabpanel-2");
  const panel3 = page.locator("#tabpanel-3");

  assert.equal(await tab1.count(), 1, "#tab-1 must exist");
  assert.equal(await tab2.count(), 1, "#tab-2 must exist");
  assert.equal(await tab3.count(), 1, "#tab-3 must exist");
  assert.equal(await panel1.count(), 1, "#tabpanel-1 must exist");
  assert.equal(await panel2.count(), 1, "#tabpanel-2 must exist");
  assert.equal(await panel3.count(), 1, "#tabpanel-3 must exist");

  assert.equal(await tab1.getAttribute("aria-selected"), "true", "Tab 1 initially selected");
  assert.equal(await tab2.getAttribute("aria-selected"), "false", "Tab 2 initially not selected");
  assert.equal(await tab3.getAttribute("aria-selected"), "false", "Tab 3 initially not selected");

  assert.equal(await panel1.isVisible(), true, "Panel 1 initially visible");
  assert.equal(await panel2.isVisible(), false, "Panel 2 initially hidden");
  assert.equal(await panel3.isVisible(), false, "Panel 3 initially hidden");
  console.log("PASS: Initial tablist and tabpanel states verified");

  // 5. Test Tab traversal to #tab-1 and verify visible focus
  await page.keyboard.press("Tab");
  const isTab1Active = await tab1.evaluate(el => el === document.activeElement);
  assert.equal(isTab1Active, true, "First Tab press must focus #tab-1");

  const tab1Focus = await tab1.evaluate(el => {
    const span = el.querySelector("span");
    const style = window.getComputedStyle(span);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth
    };
  });
  assert.notEqual(tab1Focus.outlineStyle, "none", "Tab 1 span must have visible outlineStyle");
  assert.notEqual(tab1Focus.outlineWidth, "0px", "Tab 1 span outlineWidth must be greater than 0");
  console.log("PASS: Tab reaches #tab-1 with visible focus");

  // 6. Test Tab traversal from #tab-1 into active #tabpanel-1
  await page.keyboard.press("Tab");
  const isPanel1Active = await panel1.evaluate(el => el === document.activeElement);
  assert.equal(isPanel1Active, true, "Second Tab press must focus active #tabpanel-1");

  const panel1Focus = await panel1.evaluate(el => {
    const style = window.getComputedStyle(el);
    return {
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth
    };
  });
  assert.notEqual(panel1Focus.outlineStyle, "none", "#tabpanel-1 must have visible outlineStyle");
  assert.notEqual(panel1Focus.outlineWidth, "0px", "#tabpanel-1 outlineWidth must be greater than 0");
  console.log("PASS: Tab reaches active #tabpanel-1 with visible focus");

  // 7. Test Shift+Tab back to #tab-1
  await page.keyboard.press("Shift+Tab");
  const isTab1ActiveAgain = await tab1.evaluate(el => el === document.activeElement);
  assert.equal(isTab1ActiveAgain, true, "Shift+Tab must return focus to #tab-1");
  console.log("PASS: Shift+Tab returns focus from panel to tab");

  // 8. Test Arrow key navigation across tabs with wrapping
  await page.keyboard.press("ArrowRight");
  assert.equal(await tab2.evaluate(el => el === document.activeElement), true, "ArrowRight must focus #tab-2");

  await page.keyboard.press("ArrowRight");
  assert.equal(await tab3.evaluate(el => el === document.activeElement), true, "ArrowRight must focus #tab-3");

  await page.keyboard.press("ArrowRight");
  assert.equal(await tab1.evaluate(el => el === document.activeElement), true, "ArrowRight from last tab wraps to #tab-1");

  await page.keyboard.press("ArrowLeft");
  assert.equal(await tab3.evaluate(el => el === document.activeElement), true, "ArrowLeft from first tab wraps to #tab-3");

  await page.keyboard.press("Home");
  assert.equal(await tab1.evaluate(el => el === document.activeElement), true, "Home key must focus #tab-1");

  await page.keyboard.press("End");
  assert.equal(await tab3.evaluate(el => el === document.activeElement), true, "End key must focus #tab-3");
  console.log("PASS: Arrow keys, Home, and End navigate tabs with wrapping");

  // 9. Test keyboard activation of #tab-2 via Enter
  await page.keyboard.press("Home");
  await page.keyboard.press("ArrowRight");
  assert.equal(await tab2.evaluate(el => el === document.activeElement), true, "Focused on #tab-2");
  assert.equal(await tab2.getAttribute("aria-selected"), "false", "Tab 2 not yet activated before Enter");

  await page.keyboard.press("Enter");
  assert.equal(await tab2.getAttribute("aria-selected"), "true", "Enter key activates #tab-2 (aria-selected='true')");
  assert.equal(await tab1.getAttribute("aria-selected"), "false", "#tab-1 is no longer selected");
  assert.equal(await panel2.isVisible(), true, "#tabpanel-2 is now visible");
  assert.equal(await panel1.isVisible(), false, "#tabpanel-1 is now hidden");

  // Press Tab to traverse into #tabpanel-2
  await page.keyboard.press("Tab");
  assert.equal(await panel2.evaluate(el => el === document.activeElement), true, "Tab focuses active #tabpanel-2");
  await page.keyboard.press("Shift+Tab");
  assert.equal(await tab2.evaluate(el => el === document.activeElement), true, "Shift+Tab returns to #tab-2");
  console.log("PASS: Enter activates #tab-2 and enables Tab into #tabpanel-2");

  // 10. Test keyboard activation of #tab-3 via Space
  await page.keyboard.press("ArrowRight");
  assert.equal(await tab3.evaluate(el => el === document.activeElement), true, "Focused on #tab-3");
  assert.equal(await tab3.getAttribute("aria-selected"), "false", "Tab 3 not yet activated before Space");

  await page.keyboard.press("Space");
  assert.equal(await tab3.getAttribute("aria-selected"), "true", "Space key activates #tab-3 (aria-selected='true')");
  assert.equal(await tab2.getAttribute("aria-selected"), "false", "#tab-2 is no longer selected");
  assert.equal(await panel3.isVisible(), true, "#tabpanel-3 is now visible");
  assert.equal(await panel2.isVisible(), false, "#tabpanel-2 is now hidden");

  // Press Tab to traverse into #tabpanel-3
  await page.keyboard.press("Tab");
  assert.equal(await panel3.evaluate(el => el === document.activeElement), true, "Tab focuses active #tabpanel-3");
  console.log("PASS: Space activates #tab-3 and enables Tab into #tabpanel-3");

  // 11. Reject positive tabindex values
  const positiveTabindexCount = await page.locator("[tabindex]").evaluateAll(elements =>
    elements.filter(el => Number(el.getAttribute("tabindex")) > 0).length
  );
  assert.equal(positiveTabindexCount, 0, "No positive tabindex values allowed");
  console.log("PASS: No positive tabindex values found");

  // 12. Reject unexpected browser errors
  assert.deepEqual(browserErrors, [], "No unexpected browser/page errors allowed");
  console.log("PASS: No unexpected page or console errors");

  console.log("\nAll R18-T051 regression checks passed successfully.");
} catch (error) {
  console.error("\nR18-T051 FAILED:", error);
  process.exitCode = 1;
} finally {
  if (context) await context.close();
  if (browser) await browser.close();
  if (server?.listening) {
    await new Promise(resolveClose => server.close(resolveClose));
  }
}
