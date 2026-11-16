import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const port = 8001;
const url = `http://127.0.0.1:${port}/javascript/introduction-to-js-1/troubleshooting/number-game-errors.html`;

let server;
let browser;

async function waitForServer() {
  for (let i = 0; i < 50; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Local server did not become ready.");
}

async function main() {
  try {
    server = spawn("python3", ["-m", "http.server", String(port)], {
      stdio: "ignore",
    });

    await waitForServer();

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    const pageErrors = [];

    page.on("pageerror", (error) => pageErrors.push(error.message));

    // Make the random answer predictable: 50.
    await page.addInitScript(() => {
      Math.random = () => 0.49;
    });

    await page.goto(url);

    assert.equal(await page.title(), "Number guessing game");

    const input = page.locator("#guessField");
    const submit = page.locator(".guessSubmit");
    const feedback = page.locator(".lowOrHi");
    const result = page.locator(".lastResult");
    const guesses = page.locator(".guesses");

    assert.equal(await input.isVisible(), true);
    assert.equal(await submit.isVisible(), true);
    assert.equal(await page.locator('label[for="guessField"]').count(), 1);

    const layout = await page.locator("body").evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        width: element.getBoundingClientRect().width,
        minWidth: style.minWidth,
        maxWidth: style.maxWidth,
      };
    });

    assert.ok(layout.width >= 480 && layout.width <= 800);
    assert.equal(layout.minWidth, "480px");
    assert.equal(layout.maxWidth, "800px");

    await input.fill("75");
    await submit.click();
    assert.match(await feedback.textContent(), /too high/i);

    await input.fill("25");
    await submit.click();
    assert.match(await feedback.textContent(), /too low/i);

    for (let i = 0; i < 8; i++) {
      await input.fill("25");
      await submit.click();
    }

    assert.match(await result.textContent(), /GAME OVER/i);
    assert.equal(await input.isDisabled(), true);
    assert.equal(await submit.isDisabled(), true);
    assert.equal(await page.getByRole("button", { name: "Start new game" }).count(), 1);

    await page.getByRole("button", { name: "Start new game" }).click();

    assert.equal(await input.isDisabled(), false);
    assert.equal(await submit.isDisabled(), false);
    assert.equal(await input.inputValue(), "");
    assert.equal(await guesses.textContent(), "");

    await input.fill("50");
    await submit.click();

    assert.match(await result.textContent(), /Congratulations/i);
    assert.equal(await input.isDisabled(), true);
    assert.equal(await submit.isDisabled(), true);

    assert.deepEqual(pageErrors, [], "Unexpected browser page errors");

    console.log("PASS: page loads and layout is within expected limits");
    console.log("PASS: high and low guesses display correct feedback");
    console.log("PASS: ten guesses trigger game over");
    console.log("PASS: starting a new game resets the controls and results");
    console.log("PASS: correct guess wins the game");
    console.log("PASS: no unexpected browser page errors");
  } finally {
    if (browser) await browser.close();
    if (server) {
      server.kill();
      await new Promise((resolve) => server.once("exit", resolve));
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
