import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const root = process.cwd();
const targetPath = "html/forms/custom-radio-styles/index.html";
const evidenceDir = path.join(root, "work/R18-T054");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png"
};

let server;
let browser;

const serverFactory = () => {
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
      const content = fs.readFileSync(filePath);
      res.writeHead(200, {
        "Content-Type": mimeTypes[ext] || "text/html; charset=utf-8"
      });
      res.end(content);
    } catch {
      res.writeHead(500);
      res.end("Server error");
    }
  });
};

async function main() {
  fs.mkdirSync(evidenceDir, { recursive: true });

  server = serverFactory();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });

  const port = server.address().port;
  browser = await chromium.launch({ headless: true });

  const browserErrors = [];
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("pageerror", err => browserErrors.push(`Page error: ${err.message}`));
  page.on("console", msg => {
    if (msg.type() === "error") browserErrors.push(`Console error: ${msg.text()}`);
  });

  const pageUrl = `http://127.0.0.1:${port}/${targetPath}`;

  // -----------------------------------------------------------------
  // 1. Baseline: Repeated Page Load & DOM Node Verification
  // -----------------------------------------------------------------
  console.log("\n--- Scenario 1: Baseline Repeated Initialization ---");
  for (let loadIndex = 1; loadIndex <= 2; loadIndex++) {
    const resp = await page.goto(pageUrl, { waitUntil: "networkidle" });
    assert.equal(resp.status(), 200, `Load ${loadIndex}: HTTP status must be 200`);

    const forms = page.locator("form");
    const fieldsets = page.locator("fieldset");
    const legends = page.locator("legend");
    const inputs = page.locator('input[type="radio"]');

    assert.equal(await forms.count(), 1, `Load ${loadIndex}: Exactly 1 form anchor must exist`);
    assert.equal(await fieldsets.count(), 1, `Load ${loadIndex}: Exactly 1 fieldset must exist`);
    assert.equal(await legends.count(), 1, `Load ${loadIndex}: Exactly 1 legend must exist`);
    assert.equal(await inputs.count(), 3, `Load ${loadIndex}: Exactly 3 radio inputs must exist`);

    const values = await inputs.evaluateAll(els => els.map(el => el.value));
    assert.deepEqual(values, ["cherry", "banana", "strawberry"], "Radio values must match baseline");

    // Check custom styling
    const radioStyles = await inputs.first().evaluate(el => {
      const s = window.getComputedStyle(el);
      return {
        appearance: s.appearance,
        width: s.width,
        height: s.height,
        borderRadius: s.borderRadius
      };
    });
    assert.equal(radioStyles.appearance, "none", "Radio appearance must be none");
    assert.equal(radioStyles.width, "20px", "Radio width must be 20px");
    assert.equal(radioStyles.height, "20px", "Radio height must be 20px");
    assert.equal(radioStyles.borderRadius, "10px", "Radio borderRadius must be 10px");

    console.log(`PASS: Baseline load ${loadIndex} verified (DOM nodes and styles singular)`);
  }

  await page.screenshot({
    path: path.join(evidenceDir, "baseline-normal.png"),
    fullPage: true
  });

  // -----------------------------------------------------------------
  // 2. Repeated User Interactions: Mutual Exclusivity & Single Updates
  // -----------------------------------------------------------------
  console.log("\n--- Scenario 2: Repeated Interactions ---");
  const cherry = page.locator('input[value="cherry"]');
  const banana = page.locator('input[value="banana"]');
  const strawberry = page.locator('input[value="strawberry"]');

  // Interaction 1: Check cherry
  await cherry.check();
  assert.equal(await cherry.isChecked(), true, "Cherry should be checked");
  assert.equal(await banana.isChecked(), false, "Banana should not be checked");
  assert.equal(await strawberry.isChecked(), false, "Strawberry should not be checked");

  // Interaction 2: Check banana
  await banana.check();
  assert.equal(await cherry.isChecked(), false, "Cherry should be unchecked when banana is checked");
  assert.equal(await banana.isChecked(), true, "Banana should be checked");

  // Interaction 3 (Repeat): Check cherry again
  await cherry.check();
  assert.equal(await cherry.isChecked(), true, "Cherry should be checked on repeated interaction");
  assert.equal(await banana.isChecked(), false, "Banana should be unchecked");

  // Verify DOM nodes remain un-duplicated after multiple interactions
  assert.equal(await page.locator("form").count(), 1, "Form node count must remain 1");
  assert.equal(await page.locator('input[type="radio"]').count(), 3, "Input node count must remain 3");

  await page.screenshot({
    path: path.join(evidenceDir, "repeated-interaction.png"),
    fullPage: true
  });
  console.log("PASS: Repeated interactions preserve mutual exclusivity with zero node duplication");

  // -----------------------------------------------------------------
  // 3. Isolated Harness: Repeated Style/Demo Toggles & Complete Cleanup
  // -----------------------------------------------------------------
  console.log("\n--- Scenario 3: Isolated Repeated Style Toggle Harness ---");
  const lifecycle = await page.evaluate(async () => {
    const harnessState = {
      initializations: 0,
      toggleClicks: 0,
      timerTicks: 0,
      activeListeners: 0,
      activeTimers: 0
    };

    let currentCleanup = null;

    function initHarness() {
      if (currentCleanup) {
        currentCleanup();
      }

      harnessState.initializations++;

      const form = document.querySelector("form");
      const toggleBtn = document.createElement("button");
      toggleBtn.id = "r18-t054-theme-toggle";
      toggleBtn.type = "button";
      toggleBtn.textContent = "Toggle Accent Mode";

      const panel = document.createElement("div");
      panel.id = "r18-t054-status-panel";
      panel.style.padding = "6px";
      panel.style.margin = "8px 0";
      panel.textContent = "Status: Initialized";

      form.insertBefore(toggleBtn, form.firstChild);
      form.appendChild(panel);

      function onClick() {
        harnessState.toggleClicks++;
        form.classList.toggle("r18-t054-accent");
        panel.textContent = form.classList.contains("r18-t054-accent")
          ? "Status: Accent Active"
          : "Status: Default Active";
      }

      toggleBtn.addEventListener("click", onClick);
      harnessState.activeListeners = 1;

      const timerId = window.setInterval(() => {
        harnessState.timerTicks++;
      }, 50);
      harnessState.activeTimers = 1;

      currentCleanup = () => {
        toggleBtn.removeEventListener("click", onClick);
        harnessState.activeListeners = 0;
        window.clearInterval(timerId);
        harnessState.activeTimers = 0;
        toggleBtn.remove();
        panel.remove();
        form.classList.remove("r18-t054-accent");
        currentCleanup = null;
      };

      return { toggleBtn, panel };
    }

    try {
      // 1. First initialization
      initHarness();
      // 2. Repeated initialization immediately
      const { toggleBtn } = initHarness();

      const stateAfterRepeatInit = {
        initializations: harnessState.initializations,
        buttons: document.querySelectorAll("#r18-t054-theme-toggle").length,
        panels: document.querySelectorAll("#r18-t054-status-panel").length,
        activeListeners: harnessState.activeListeners,
        activeTimers: harnessState.activeTimers
      };

      // Interact twice
      const form = document.querySelector("form");
      toggleBtn.click();
      const afterFirstClickActive = form.classList.contains("r18-t054-accent");

      toggleBtn.click();
      const afterSecondClickActive = form.classList.contains("r18-t054-accent");

      await new Promise(r => window.setTimeout(r, 120));
      const ticksBeforeCleanup = harnessState.timerTicks;

      // Complete cleanup
      const detachedBtn = toggleBtn;
      currentCleanup();

      // Ensure click on detached element causes no updates
      detachedBtn.click();

      await new Promise(r => window.setTimeout(r, 120));
      const ticksAfterCleanup = harnessState.timerTicks;

      return {
        stateAfterRepeatInit,
        afterFirstClickActive,
        afterSecondClickActive,
        totalToggleClicks: harnessState.toggleClicks,
        ticksBeforeCleanup,
        ticksAfterCleanup,
        finalState: {
          buttons: document.querySelectorAll("#r18-t054-theme-toggle").length,
          panels: document.querySelectorAll("#r18-t054-status-panel").length,
          activeListeners: harnessState.activeListeners,
          activeTimers: harnessState.activeTimers
        }
      };
    } finally {
      if (currentCleanup) currentCleanup();
    }
  });

  assert.equal(lifecycle.stateAfterRepeatInit.initializations, 2, "Harness initialized twice");
  assert.equal(lifecycle.stateAfterRepeatInit.buttons, 1, "Exactly 1 toggle button exists after repeat init");
  assert.equal(lifecycle.stateAfterRepeatInit.panels, 1, "Exactly 1 panel exists after repeat init");
  assert.equal(lifecycle.stateAfterRepeatInit.activeListeners, 1, "Exactly 1 active listener exists after repeat init");
  assert.equal(lifecycle.stateAfterRepeatInit.activeTimers, 1, "Exactly 1 active timer exists after repeat init");

  assert.equal(lifecycle.afterFirstClickActive, true, "First click toggles accent mode on");
  assert.equal(lifecycle.afterSecondClickActive, false, "Second click toggles accent mode off");
  assert.equal(lifecycle.totalToggleClicks, 2, "Two clicks produce exactly two updates");

  assert.ok(lifecycle.ticksBeforeCleanup > 0, "Timer ran before cleanup");
  assert.equal(lifecycle.ticksAfterCleanup, lifecycle.ticksBeforeCleanup, "Timer stopped after cleanup");

  assert.equal(lifecycle.finalState.buttons, 0, "All harness buttons removed after cleanup");
  assert.equal(lifecycle.finalState.panels, 0, "All harness panels removed after cleanup");
  assert.equal(lifecycle.finalState.activeListeners, 0, "Zero active listeners remain after cleanup");
  assert.equal(lifecycle.finalState.activeTimers, 0, "Zero active timers remain after cleanup");

  await page.screenshot({
    path: path.join(evidenceDir, "isolated-harness.png"),
    fullPage: true
  });
  console.log("PASS: Isolated harness verified (repeat init, singular updates, full cleanup)");

  // -----------------------------------------------------------------
  // 4. Verify Zero Unexpected Page Errors
  // -----------------------------------------------------------------
  assert.deepEqual(browserErrors, [], "No unexpected page errors allowed");
  console.log("PASS: Zero console or page errors detected");

  await context.close();
  console.log("\nAll R18-T054 checks passed successfully.");
}

main().catch(err => {
  console.error("\nR18-T054 FAILED:", err);
  process.exitCode = 1;
}).finally(async () => {
  if (browser) await browser.close();
  if (server?.listening) {
    await new Promise(r => server.close(r));
  }
});
