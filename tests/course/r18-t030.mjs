import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const require = createRequire(import.meta.url);
const scriptPath = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(scriptPath), "../..");
const evidenceDir = path.join(repoRoot, "work/R18-T030");
const targetPath = "/accessibility/multimedia/audio-transcript-ui/";
const pageUrl = port => `http://127.0.0.1:${port}${targetPath}`;
const delay = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

async function reservePort() {
  const probe = net.createServer();
  await new Promise((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(0, "127.0.0.1", resolve);
  });
  const { port } = probe.address();
  await new Promise((resolve, reject) => probe.close(error => error ? reject(error) : resolve()));
  return port;
}

async function startServer(port) {
  const server = spawn(
    "python3",
    ["-m", "http.server", String(port), "--bind", "127.0.0.1", "--directory", repoRoot],
    { stdio: ["ignore", "pipe", "pipe"] },
  );
  let output = "";
  server.stdout.setEncoding("utf8").on("data", chunk => { output += chunk; });
  server.stderr.setEncoding("utf8").on("data", chunk => { output += chunk; });
  const exited = new Promise(resolve => server.once("exit", (code, signal) => resolve({ code, signal })));

  try {
    for (let attempt = 0; attempt < 50; attempt++) {
      if (server.exitCode !== null) {
        throw new Error(`Local server exited before becoming ready: ${output}`);
      }
      try {
        const response = await fetch(pageUrl(port));
        if (response.status === 200) {
          return { server, exited };
        }
        throw new Error(`Local server returned HTTP ${response.status}`);
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("Local server returned")) {
          throw error;
        }
        await delay(100);
      }
    }
    throw new Error(`Local server did not become ready: ${output}`);
  } catch (error) {
    await stopServer(server, exited);
    throw error;
  }
}

async function stopServer(server, exited) {
  if (server.exitCode === null && server.signalCode === null) {
    server.kill("SIGTERM");
    const stopResult = await Promise.race([exited, delay(2000).then(() => null)]);
    if (!stopResult) {
      server.kill("SIGKILL");
      await exited;
    }
  }
}

async function addMediaStub(context) {
  await context.addInitScript(() => {
    const installStub = () => {
      const audio = document.querySelector("audio");
      if (!audio || audio.dataset.playwrightStub === "true") {
        return;
      }

      audio.dataset.playwrightStub = "true";
      let paused = true;
      let currentTime = 8;
      Object.defineProperties(audio, {
        paused: { configurable: true, get: () => paused },
        duration: { configurable: true, get: () => 60 },
        currentTime: {
          configurable: true,
          get: () => currentTime,
          set: value => { currentTime = value; },
        },
      });
      audio.play = () => {
        paused = false;
        return Promise.resolve();
      };
      audio.pause = () => {
        paused = true;
      };
    };

    new MutationObserver(installStub).observe(document, { childList: true, subtree: true });
    document.addEventListener("DOMContentLoaded", installStub, { once: true });
  });
}

async function openPage(context, port, pageErrors, mutateScript) {
  const page = await context.newPage();
  page.on("pageerror", error => pageErrors.push(error.message));

  if (mutateScript) {
    await page.route("**/accessibility/multimedia/audio-transcript-ui/main.js", async route => {
      const source = readFileSync(path.join(repoRoot, "accessibility/multimedia/audio-transcript-ui/main.js"), "utf8");
      const originalBinding = "transcriptBtn.onclick = function() {";
      assert.equal(source.split(originalBinding).length - 1, 1, "mutation target occurs exactly once");
      const mutated = source.replace(originalBinding, "transcriptBtn.onclick = null;\nif (false) {");
      await route.fulfill({ status: 200, contentType: "text/javascript", body: mutated });
    });
  }

  const response = await page.goto(pageUrl(port), { waitUntil: "load" });
  assert.equal(response?.status(), 200, "example page responds successfully");
  return page;
}

async function inspectInitialState(page) {
  return page.evaluate(() => {
    const audio = document.querySelector("audio");
    const transcript = document.querySelector(".transcript");
    const transcriptButton = document.querySelector(".transcript-container button");
    const player = document.querySelector(".player");

    return {
      title: document.title,
      audio: {
        present: Boolean(audio),
        nativeControls: audio.controls,
        sources: [...audio.querySelectorAll("source")].map(source => source.getAttribute("src")),
        fallbackLink: audio.querySelector("a")?.getAttribute("href") ?? null,
      },
      customButtons: [...document.querySelectorAll(".controls button")].map(button => button.textContent),
      transcript: {
        label: transcriptButton.textContent,
        height: getComputedStyle(transcript).height,
        width: getComputedStyle(transcript).width,
        containerWidth: getComputedStyle(player).width,
        textLength: transcript.innerText.length,
      },
    };
  });
}

async function verifyCorrectPage(page) {
  const initial = await inspectInitialState(page);
  assert.equal(initial.title, "Audio transcript example", "the intended example page is loaded");
  assert.equal(initial.audio.present, true, "the native audio element is present");
  assert.equal(initial.audio.nativeControls, false, "custom controls replace native controls");
  assert.deepEqual(initial.audio.sources, ["../viper.mp3", "../viper.ogg"], "both audio formats are available");
  assert.equal(initial.audio.fallbackLink, "../viper.mp3", "fallback link targets the MP3");
  assert.deepEqual(initial.customButtons, ["Play", "Stop", "Rwd", "Fwd"], "custom player controls are rendered");
  assert.equal(initial.transcript.label, "Show transcript", "transcript starts collapsed");
  assert.equal(initial.transcript.height, "0px", "collapsed transcript has zero computed height");
  assert.ok(Number.parseFloat(initial.transcript.width) > 0, "transcript has a rendered width");
  assert.ok(Number.parseFloat(initial.transcript.containerWidth) > 0, "player has a rendered width");
  assert.ok(initial.transcript.textLength > 0, "transcript text remains in the document");

  await page.locator(".playpause").click();
  const playing = await page.evaluate(() => ({
    label: document.querySelector(".playpause").textContent,
    paused: document.querySelector("audio").paused,
  }));
  assert.deepEqual(playing, { label: "Pause", paused: false }, "Play starts audio and changes its label");

  await page.locator(".playpause").click();
  const paused = await page.evaluate(() => ({
    label: document.querySelector(".playpause").textContent,
    paused: document.querySelector("audio").paused,
  }));
  assert.deepEqual(paused, { label: "Play", paused: true }, "Pause stops audio and restores its label");

  await page.locator(".fwd").click();
  const forwardWhilePaused = await page.evaluate(() => document.querySelector("audio").currentTime);
  assert.equal(forwardWhilePaused, 0, "forward while paused follows the example's reset behavior");

  await page.locator(".playpause").click();
  await page.locator(".fwd").click();
  const forwarded = await page.evaluate(() => document.querySelector("audio").currentTime);
  assert.equal(forwarded, 3, "forward while playing advances three seconds");
  await page.locator(".rwd").click();
  const rewound = await page.evaluate(() => document.querySelector("audio").currentTime);
  assert.equal(rewound, 0, "rewind subtracts three seconds");

  await page.evaluate(() => {
    const audio = document.querySelector("audio");
    audio.currentTime = 14;
    audio.dispatchEvent(new Event("timeupdate"));
  });
  const displayedTime = await page.locator(".time").innerText();
  assert.equal(displayedTime, "00:14", "timeupdate renders the current media time");
  await page.locator(".stop").click();
  const stopped = await page.evaluate(() => ({
    currentTime: document.querySelector("audio").currentTime,
    paused: document.querySelector("audio").paused,
    label: document.querySelector(".playpause").textContent,
  }));
  assert.deepEqual(stopped, { currentTime: 0, paused: true, label: "Play" }, "Stop pauses and resets audio");

  const transcriptButton = page.locator(".transcript-container button");
  await transcriptButton.click();
  const opened = await page.evaluate(() => {
    const transcript = document.querySelector(".transcript");
    return {
      label: document.querySelector(".transcript-container button").textContent,
      height: getComputedStyle(transcript).height,
      clientHeight: transcript.clientHeight,
      scrollHeight: transcript.scrollHeight,
    };
  });
  assert.equal(opened.label, "Hide transcript", "transcript button switches to Hide transcript");
  assert.equal(opened.height, "150px", "transcript expands to 150px");
  assert.ok(opened.scrollHeight > opened.clientHeight, "expanded transcript content can scroll");

  await transcriptButton.click();
  const closed = await page.evaluate(() => ({
    label: document.querySelector(".transcript-container button").textContent,
    height: getComputedStyle(document.querySelector(".transcript")).height,
  }));
  assert.deepEqual(closed, { label: "Show transcript", height: "0px" }, "transcript button collapses the transcript");

  const minuteDisplay = await page.evaluate(() => {
    const audio = document.querySelector("audio");
    audio.currentTime = 65;
    audio.dispatchEvent(new Event("timeupdate"));
    return document.querySelector(".time").textContent;
  });
  assert.equal(minuteDisplay, "01:05", "time display formats minutes and seconds");

  return { initial, media: { playing, paused, forwardWhilePaused, forwarded, rewound, displayedTime, stopped, minuteDisplay }, transcript: { opened, closed } };
}

async function verifyMutation(page) {
  const initial = await inspectInitialState(page);
  assert.equal(initial.transcript.label, "Show transcript", "mutated fixture begins in the normal collapsed state");
  const button = page.locator(".transcript-container button");
  await button.click();

  let intendedFailure;
  try {
    assert.equal(
      await button.innerText(),
      "Hide transcript",
      "transcript button switches to Hide transcript",
    );
  } catch (error) {
    intendedFailure = error;
  }

  assert.ok(intendedFailure instanceof assert.AssertionError, "missing event binding causes an assertion failure");
  assert.match(intendedFailure.message, /transcript button switches to Hide transcript/, "failure identifies the transcript interaction");
  const actual = await page.evaluate(() => ({
    label: document.querySelector(".transcript-container button").textContent,
    height: getComputedStyle(document.querySelector(".transcript")).height,
  }));
  assert.deepEqual(actual, { label: "Show transcript", height: "0px" }, "mutated fixture stays collapsed after click");
  return {
    mutation: "Replaced only the transcript button event binding with null in the served main.js fixture.",
    expected: "AssertionError: transcript button switches to Hide transcript",
    actual: { ...actual, failure: intendedFailure.message.split("\n")[0] },
  };
}

async function main() {
  const report = {
    task: "R18-T030",
    target: targetPath,
    startedAt: new Date().toISOString(),
    tools: {
      node: process.version,
      playwright: JSON.parse(readFileSync(require.resolve("playwright/package.json"), "utf8")).version,
      python: execFileSync("python3", ["--version"], { encoding: "utf8" }).trim(),
    },
    expected: {
      transcript: {
        initial: { label: "Show transcript", height: "0px" },
        open: { label: "Hide transcript", height: "150px" },
        closed: { label: "Show transcript", height: "0px" },
      },
      audio: {
        sources: ["../viper.mp3", "../viper.ogg"],
        controls: ["Play", "Stop", "Rwd", "Fwd"],
        playPauseLabels: ["Pause", "Play"],
        stop: { currentTime: 0, paused: true, label: "Play" },
      },
      mutation: { assertion: "transcript button switches to Hide transcript", expectedToFail: true },
      pageErrors: [],
    },
  };
  let failure;
  let server;
  let serverExited;
  let browser;
  const contexts = [];

  try {
    const port = await reservePort();
    ({ server, exited: serverExited } = await startServer(port));
    browser = await chromium.launch({ headless: true });
    report.tools.chromium = browser.version();
    report.server = { command: "python3 -m http.server", host: "127.0.0.1", port, readiness: "HTTP 200" };

    const correctContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    contexts.push(correctContext);
    await addMediaStub(correctContext);
    const correctPageErrors = [];
    const correctPage = await openPage(correctContext, port, correctPageErrors, false);
    report.correctBehavior = await verifyCorrectPage(correctPage);
    await delay(50);
    assert.deepEqual(correctPageErrors, [], "correct page has no uncaught page errors");
    report.correctBehavior.pageErrors = correctPageErrors;
    await correctContext.close();

    const mutationContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    contexts.push(mutationContext);
    await addMediaStub(mutationContext);
    const mutationPageErrors = [];
    const mutationPage = await openPage(mutationContext, port, mutationPageErrors, true);
    report.mutatedFixture = await verifyMutation(mutationPage);
    await delay(50);
    assert.deepEqual(mutationPageErrors, [], "mutated fixture has no unrelated page errors");
    report.mutatedFixture.pageErrors = mutationPageErrors;
  } catch (error) {
    failure = error;
  } finally {
    for (const context of contexts) {
      try {
        await context.close();
      } catch (error) {
        failure ??= error;
      }
    }
    if (browser) {
      try {
        await browser.close();
      } catch (error) {
        failure ??= error;
      }
    }
    if (server) {
      try {
        await stopServer(server, serverExited);
      } catch (error) {
        failure ??= error;
      }
    }
    report.finishedAt = new Date().toISOString();
    report.status = failure ? "failed" : "passed";
    if (failure) {
      report.failure = { name: failure.name, message: failure.message };
    }
    mkdirSync(evidenceDir, { recursive: true });
    writeFileSync(path.join(evidenceDir, "results.json"), `${JSON.stringify(report, null, 2)}\n`);
  }

  if (failure) {
    throw failure;
  }
  console.log(`R18-T030 passed. Results: ${path.relative(repoRoot, path.join(evidenceDir, "results.json"))}`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
