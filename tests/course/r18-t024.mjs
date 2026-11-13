import assert from "node:assert/strict";
import { spawn, execFileSync } from "node:child_process";
import { createServer } from "node:net";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const evidenceDir = resolve(repoRoot, "work/R18-T024");
const pagePath = "/css/web-fonts/fonts/zantroke-demo.html";
const tabsScriptPath = resolve(
  repoRoot,
  "css/web-fonts/fonts/specimen_tabs.js",
);
const tabSequence = [
  "layout",
  "specimen",
  "layout",
  "glyphs",
  "installing",
  "specimen",
];
const baseline = {
  capturedBeforeChanges: true,
  observations: {
    jqueryLoaded: true,
    easyTabsAvailable: false,
    pageErrors: ["$(...).easyTabs is not a function"],
    failedResources: ["specimen_files/easytabs.js returned 404"],
    activeTabsAfterLoad: [],
    visibleLinkedPanelsAfterLoad: [
      "specimen",
      "layout",
      "glyphs",
      "installing",
    ],
    visibleLinkedPanelsAfterClickingLayout: [
      "specimen",
      "layout",
      "glyphs",
      "installing",
    ],
    containerHeight: 6466.671875,
    containerWidth: 865,
  },
};

const inputs = {
  pagePath,
  viewport: { width: 1280, height: 900 },
  tabSequence,
  requiredIds: ["container", "header", "main_content", "specimen"],
  repeatInitialization: true,
  assertions: [
    "one active tab and one visible linked panel after each click",
    "one active click listener after repeated initialization",
    "one handler invocation per click",
    "no active page timers",
    "no additional nodes within #container",
    "specimen font and rendered layout",
    "no browser page errors, console errors, or failed HTTP requests",
  ],
};

function writeEvidence(file, data) {
  writeFileSync(
    resolve(evidenceDir, file),
    `${JSON.stringify(data, null, 2)}\n`,
  );
}

async function findAvailablePort() {
  const server = createServer();
  await new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const { port } = server.address();
  await new Promise((resolveClose, reject) => {
    server.close((error) => (error ? reject(error) : resolveClose()));
  });
  return port;
}

async function waitForServer(server, url) {
  const deadline = Date.now() + 10_000;

  while (Date.now() < deadline) {
    if (server.exitCode !== null || server.signalCode !== null) {
      throw new Error(
        `Local server exited with code ${server.exitCode} and signal ${server.signalCode}`,
      );
    }

    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
      continue;
    }

    await new Promise((resolveDelay) => setTimeout(resolveDelay, 100));
  }

  throw new Error(`Local server did not become ready at ${url}`);
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) {
    return;
  }

  const exited = new Promise((resolveExit) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolveExit();
    } else {
      child.once("exit", resolveExit);
    }
  });
  child.kill("SIGTERM");
  await Promise.race([
    exited,
    new Promise((resolveDelay) => setTimeout(resolveDelay, 3000)),
  ]);

  if (child.exitCode === null && child.signalCode === null) {
    child.kill("SIGKILL");
    await exited;
  }
}

mkdirSync(evidenceDir, { recursive: true });
writeEvidence("inputs.json", inputs);
writeEvidence("baseline.json", baseline);

const results = {
  task: "R18-T024",
  baseline: baseline.observations,
  expected: {
    activeTabCount: 1,
    visibleLinkedPanelCount: 1,
    listenerCountAfterSecondInitialization: 1,
    handlerInvocationsPerClick: 1,
    activeTimeoutCount: 0,
    activeIntervalCount: 0,
    addedContainerNodes: 0,
    browserErrors: [],
  },
  actual: null,
  status: "running",
};

let server;
let browser;
let context;
let page;
let serverOutput = "";
let changedMetrics;

try {
  const port = await findAvailablePort();
  const baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(
    "python3",
    [
      "-m",
      "http.server",
      String(port),
      "--bind",
      "127.0.0.1",
      "--directory",
      repoRoot,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  server.stdout.setEncoding("utf8").on("data", (chunk) => {
    serverOutput += chunk;
  });
  server.stderr.setEncoding("utf8").on("data", (chunk) => {
    serverOutput += chunk;
  });
  await waitForServer(server, `${baseUrl}/`);

  browser = await chromium.launch({ headless: true });
  context = await browser.newContext({
    viewport: inputs.viewport,
  });
  await context.addInitScript(() => {
    const state = {
      tabAdds: 0,
      tabRemoves: 0,
      tabInvocations: 0,
      timeoutAdds: 0,
      activeTimeouts: 0,
      intervalAdds: 0,
      activeIntervals: 0,
    };
    const listenerWrappers = new WeakMap();
    const nativeAdd = EventTarget.prototype.addEventListener;
    const nativeRemove = EventTarget.prototype.removeEventListener;

    EventTarget.prototype.addEventListener = function (type, listener, options) {
      if (this instanceof Element && this.matches(".tabs") && type === "click") {
        state.tabAdds += 1;
        const wrappedListener = function (...args) {
          state.tabInvocations += 1;
          return listener.apply(this, args);
        };
        listenerWrappers.set(listener, wrappedListener);
        return nativeAdd.call(this, type, wrappedListener, options);
      }

      return nativeAdd.call(this, type, listener, options);
    };

    EventTarget.prototype.removeEventListener = function (
      type,
      listener,
      options,
    ) {
      if (this instanceof Element && this.matches(".tabs") && type === "click") {
        state.tabRemoves += 1;
        return nativeRemove.call(
          this,
          type,
          listenerWrappers.get(listener) || listener,
          options,
        );
      }

      return nativeRemove.call(this, type, listener, options);
    };

    const nativeSetTimeout = window.setTimeout;
    const nativeClearTimeout = window.clearTimeout;
    window.setTimeout = function (callback, delay, ...args) {
      state.timeoutAdds += 1;
      state.activeTimeouts += 1;
      let timeoutId;
      timeoutId = nativeSetTimeout.call(
        window,
        (...callbackArgs) => {
          state.activeTimeouts -= 1;
          callback(...callbackArgs);
        },
        delay,
        ...args,
      );
      return timeoutId;
    };
    window.clearTimeout = function (timeoutId) {
      state.activeTimeouts = Math.max(0, state.activeTimeouts - 1);
      return nativeClearTimeout.call(window, timeoutId);
    };

    const nativeSetInterval = window.setInterval;
    const nativeClearInterval = window.clearInterval;
    const activeIntervalIds = new Set();
    window.setInterval = function (callback, delay, ...args) {
      state.intervalAdds += 1;
      const intervalId = nativeSetInterval.call(
        window,
        callback,
        delay,
        ...args,
      );
      activeIntervalIds.add(intervalId);
      state.activeIntervals = activeIntervalIds.size;
      return intervalId;
    };
    window.clearInterval = function (intervalId) {
      activeIntervalIds.delete(intervalId);
      state.activeIntervals = activeIntervalIds.size;
      return nativeClearInterval.call(window, intervalId);
    };

    Object.defineProperty(window, "__r18T024", { value: state });
  });

  page = await context.newPage();
  const browserErrors = [];
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      browserErrors.push(`console: ${message.text()}`);
    }
  });
  page.on("requestfailed", (request) => {
    browserErrors.push(`request failed: ${request.url()}`);
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      browserErrors.push(
        `HTTP ${response.status()}: ${response.url()}`,
      );
    }
  });

  await page.goto(`${baseUrl}${pagePath}`, { waitUntil: "load" });
  const fontLoaded = await page.evaluate(() =>
    document.fonts.ready.then(() => document.fonts.check("16px zantrokeregular")),
  );
  const initial = await page.evaluate((fontLoaded) => {
    const container = document.querySelector("#container");
    const linkedPanels = [...document.querySelectorAll(".tabs a[href^='#']")]
      .map((link) => document.querySelector(link.hash))
      .filter(Boolean);

    return {
      title: document.title,
      requiredIds: ["container", "header", "main_content", "specimen"].every(
        (id) => document.getElementById(id),
      ),
      activeTabCount: document.querySelectorAll(".tabs li.active").length,
      activeTab: document.querySelector(".tabs li.active a")?.hash ?? null,
      visibleLinkedPanels: linkedPanels
        .filter((panel) => !panel.hidden)
        .map((panel) => panel.id),
      containerNodeCount: container.querySelectorAll("*").length,
      containerBounds: container.getBoundingClientRect().toJSON(),
      headerBackground: getComputedStyle(
        document.querySelector("#header"),
      ).backgroundColor,
      mainBackground: getComputedStyle(
        document.querySelector("#main_content"),
      ).backgroundColor,
      specimenText: document.querySelector("#specimen .huge").textContent.trim(),
      specimenFont: getComputedStyle(
        document.querySelector("#specimen .huge"),
      ).fontFamily,
      fontLoaded,
      specimenBounds: document
        .querySelector("#specimen")
        .getBoundingClientRect()
        .toJSON(),
    };
  }, fontLoaded);

  changedMetrics = {
    initial,
    lifecycleAfterReinitialize: null,
    interactions: [],
    browserErrors,
    serverOutput,
  };
  assert.equal(initial.title, "Zantroke Regular Specimen");
  assert.equal(initial.requiredIds, true);
  assert.equal(initial.activeTabCount, 1);
  assert.equal(initial.activeTab, "#specimen");
  assert.deepEqual(initial.visibleLinkedPanels, ["specimen"]);
  assert.equal(initial.containerBounds.width, 865);
  assert.equal(initial.headerBackground, "rgb(0, 0, 0)");
  assert.equal(initial.mainBackground, "rgb(255, 255, 255)");
  assert.equal(initial.specimenText, "AaBb");
  assert.match(initial.specimenFont, /zantrokeregular/);
  assert.equal(initial.fontLoaded, true);
  assert.ok(initial.specimenBounds.width > 0);
  assert.ok(initial.specimenBounds.height > 0);

  const secondInitialization = readFileSync(tabsScriptPath, "utf8");
  await page.evaluate((source) => (0, eval)(source), secondInitialization);
  const lifecycleAfterReinitialize = await page.evaluate(() => ({
    ...window.__r18T024,
    activeListeners:
      window.__r18T024.tabAdds - window.__r18T024.tabRemoves,
    containerNodeCount: document
      .querySelector("#container")
      .querySelectorAll("*").length,
  }));
  changedMetrics.lifecycleAfterReinitialize = lifecycleAfterReinitialize;
  assert.equal(lifecycleAfterReinitialize.tabAdds, 2);
  assert.equal(lifecycleAfterReinitialize.tabRemoves, 1);
  assert.equal(lifecycleAfterReinitialize.activeListeners, 1);
  assert.equal(lifecycleAfterReinitialize.activeTimeouts, 0);
  assert.equal(lifecycleAfterReinitialize.activeIntervals, 0);
  assert.equal(
    lifecycleAfterReinitialize.containerNodeCount,
    initial.containerNodeCount,
  );

  let previousInvocations = lifecycleAfterReinitialize.tabInvocations;
  for (const id of tabSequence) {
    await page.locator(`.tabs a[href="#${id}"]`).click();
    const state = await page.evaluate(() => {
      const linkedPanels = [...document.querySelectorAll(".tabs a[href^='#']")]
        .map((link) => document.querySelector(link.hash))
        .filter(Boolean);
      const container = document.querySelector("#container");
      const selectedPanel = document.querySelector(
        ".tabs li.active a",
      )?.hash.slice(1);

      return {
        selectedPanel,
        activeTabCount: document.querySelectorAll(".tabs li.active").length,
        currentLinkCount: document.querySelectorAll(
          '.tabs a[aria-current="location"]',
        ).length,
        visibleLinkedPanels: linkedPanels
          .filter((panel) => !panel.hidden)
          .map((panel) => panel.id),
        selectedPanelBounds: document
          .getElementById(selectedPanel)
          .getBoundingClientRect()
          .toJSON(),
        containerNodeCount: container.querySelectorAll("*").length,
        lifecycle: {
          ...window.__r18T024,
          activeListeners:
            window.__r18T024.tabAdds - window.__r18T024.tabRemoves,
        },
      };
    });

    assert.equal(state.selectedPanel, id);
    assert.equal(state.activeTabCount, 1);
    assert.equal(state.currentLinkCount, 1);
    assert.deepEqual(state.visibleLinkedPanels, [id]);
    assert.ok(state.selectedPanelBounds.width > 0);
    assert.ok(state.selectedPanelBounds.height > 0);
    assert.equal(state.containerNodeCount, initial.containerNodeCount);
    assert.equal(state.lifecycle.activeListeners, 1);
    assert.equal(state.lifecycle.activeTimeouts, 0);
    assert.equal(state.lifecycle.activeIntervals, 0);
    assert.equal(
      state.lifecycle.tabInvocations - previousInvocations,
      1,
    );
    previousInvocations = state.lifecycle.tabInvocations;
    changedMetrics.interactions.push({
      panel: id,
      activeTabCount: state.activeTabCount,
      visibleLinkedPanels: state.visibleLinkedPanels,
      selectedPanelBounds: state.selectedPanelBounds,
      containerNodeCount: state.containerNodeCount,
      handlerInvocations: state.lifecycle.tabInvocations,
      activeListeners: state.lifecycle.activeListeners,
      activeTimeouts: state.lifecycle.activeTimeouts,
      activeIntervals: state.lifecycle.activeIntervals,
    });
  }

  assert.deepEqual(browserErrors, []);
  results.actual = changedMetrics;
  results.status = "passed";
  console.log("R18-T024 passed: repeated initialization and tab switching are clean.");
} catch (error) {
  results.status = "failed";
  results.failure = error.stack || error.message;
  if (changedMetrics) {
    results.actual = changedMetrics;
  }
  throw error;
} finally {
  try {
    if (page && !page.isClosed()) {
      await page.close();
    }
    if (context) {
      await context.close();
    }
    if (browser) {
      await browser.close();
    }
  } finally {
    await stopChild(server);
    if (changedMetrics) {
      changedMetrics.serverOutput = serverOutput;
      results.actual = changedMetrics;
    }
    results.cleanup = {
      pageClosed: !page || page.isClosed(),
      contextClosed: !context || context.pages().length === 0,
      browserClosed: !browser || browser.isConnected() === false,
      serverStopped:
        !server || server.exitCode !== null || server.signalCode !== null,
    };
    writeEvidence("results.json", results);
    writeEvidence("tool-versions.json", {
      node: process.version,
      npm: execFileSync("npm", ["--version"], { encoding: "utf8" }).trim(),
      playwright: JSON.parse(
        readFileSync(
          resolve(repoRoot, "node_modules/playwright/package.json"),
          "utf8",
        ),
      ).version,
      chromium: browser ? browser.version() : null,
      python: execFileSync("python3", ["--version"], {
        encoding: "utf8",
      }).trim(),
      platform: process.platform,
    });
  }
}
