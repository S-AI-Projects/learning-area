import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { runCourseCheck } from './support.mjs';

const taskId = 'R18-T018';
const pagePath = 'javascript/introduction-to-js-1/troubleshooting/number-game-errors.html';
const payload = '<img src=x onerror="window.__xssTriggered=true"> https://github.com/S-AI-Projects/learning-area/issues/x';

await runCourseCheck({ taskId, pagePath, prepare: async (page) => {
  await page.addInitScript(() => {
    window.__xssTriggered = false;
    Math.random = () => 0.42;
  });
}, run: async (page) => {
  const guessField = page.locator('#guessField');
  const guessSubmit = page.locator('.guessSubmit');
  const guesses = page.locator('.guesses');
  const lastResult = page.locator('.lastResult');
  const baseline = {
    guessText: await guesses.textContent(),
    guessEnabled: await guessField.isEnabled(),
    submitEnabled: await guessSubmit.isEnabled(),
  };
  assert.equal(baseline.guessText, '');
  assert.equal(baseline.guessEnabled, true);
  assert.equal(baseline.submitEnabled, true);

  await guessField.fill(payload);
  await guessSubmit.click();
  assert.equal(await guesses.textContent(), `Previous guesses: ${payload} `);
  assert.equal(await page.locator('.guesses img').count(), 0);
  assert.equal(await page.locator('img').count(), 0);
  assert.equal(await page.evaluate(() => window.__xssTriggered), false);
  assert.equal(await lastResult.textContent(), 'Wrong!');
  assert.equal(await guessField.inputValue(), '');

  await guessField.fill('43');
  await guessSubmit.click();
  assert.equal(await guesses.textContent(), `Previous guesses: ${payload} 43 `);
  assert.equal(await lastResult.textContent(), 'Congratulations! You got it right!');
  assert.equal(await page.getByRole('button', { name: 'Start new game' }).count(), 1);
  await page.getByRole('button', { name: 'Start new game' }).click();
  assert.equal(await guesses.textContent(), '');
  assert.equal(await guessField.isEnabled(), true);
  assert.equal(await guessSubmit.isEnabled(), true);
  assert.equal(await page.getByRole('button', { name: 'Start new game' }).count(), 0);

  const source = await readFile(resolve(pagePath), 'utf8');
  assert.match(source, /guesses\.textContent \+= rawGuess/);
  assert.doesNotMatch(source, /\.innerHTML\s*=/);
  await page.waitForTimeout(25);
  assert.equal(await page.evaluate(() => window.__xssTriggered), false);
  return {
    baseline,
    payload,
    afterPayload: { renderedLiterally: true, createdImageElements: 0, handlerExecuted: false, result: 'Wrong!' },
    regularGame: { deterministicWinningGuess: 43, resetRestoresNewGame: true },
  };
} });
