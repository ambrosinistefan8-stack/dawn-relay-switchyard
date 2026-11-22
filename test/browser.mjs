import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { solve } from '../grid.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.SWITCHYARD_PLAYWRIGHT || 'playwright');
const base = process.env.SWITCHYARD_TEST_URL || 'http://127.0.0.1:5836/';
const executablePath = process.env.SWITCHYARD_BROWSER;
const browser = await chromium.launch({ headless: true, executablePath });
const artifacts = new URL('../test-artifacts/', import.meta.url);
const errors = [];

function monitor(page) {
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
}

async function readBoard(page) {
  return page.locator('.tile').evaluateAll(tiles => tiles.reduce((board, tile, index) => {
    return tile.classList.contains('tile--lit') ? board | (1 << index) : board;
  }, 0));
}

async function clearCircuit(page, index) {
  for (const cell of solve(await readBoard(page), index)) await page.locator('.tile').nth(cell).click();
  assert.equal(await readBoard(page), 65535);
}

try {
  await mkdir(artifacts, { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1365, height: 900 } });
  monitor(page);
  await page.goto(base);
  assert.equal(await page.locator('.tile').count(), 16);
  assert.equal(await page.locator('.tile:enabled').count(), 0);
  await page.screenshot({ path: fileURLToPath(new URL('ready-desktop.png', artifacts)) });

  await page.getByRole('button', { name: 'Start relay' }).click();
  const initial = await readBoard(page);
  await page.keyboard.press('ArrowRight');
  assert.match(await page.locator(':focus').getAttribute('aria-label'), /^A2,/);
  await page.keyboard.press('Enter');
  assert.notEqual(await readBoard(page), initial);
  assert.equal(await page.locator('#moves').textContent(), '1');
  await page.keyboard.press('Space');
  assert.equal(await readBoard(page), initial);

  for (let stage = 0; stage < 3; stage++) {
    await clearCircuit(page, stage);
    assert.equal(await page.locator('#online').textContent(), `${stage + 1}/3`);
    assert.equal(await page.locator('.tile:enabled').count(), 0);
    if (stage < 2) await page.getByRole('button', { name: `Open circuit ${stage + 2}` }).click();
  }

  assert.match(await page.locator('#message').textContent(), /points.*14 pulses.*2\/3 circuits at par/);
  assert.match(await page.locator('#best').textContent(), /Best solo score/);
  const completeRecap = page.getByRole('region', { name: 'Circuit recap' });
  assert.deepEqual(await completeRecap.locator('li').allTextContents(), [
    'GlasshousesOnline · 5 pulses · par 3',
    'TideworksAt par · 4 pulses · par 4',
    'Sky ArchiveAt par · 5 pulses · par 5',
  ]);
  await page.screenshot({ path: fileURLToPath(new URL('completed-desktop.png', artifacts)) });
  await page.reload();
  assert.match(await page.locator('#best').textContent(), /Best solo score/);
  await page.close();

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  monitor(mobile);
  await mobile.clock.install({ time: new Date('2026-11-22T10:00:00Z') });
  await mobile.goto(base);
  assert.ok(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await mobile.getByText('Two players', { exact: true }).tap();
  await mobile.getByRole('button', { name: 'Start relay' }).tap();
  await clearCircuit(mobile, 0);
  assert.match(await mobile.locator('#message').textContent(), /Pass the controls/);
  await mobile.getByRole('button', { name: 'Open circuit 2' }).tap();
  assert.match(await mobile.locator('#message').textContent(), /Player 2/);
  await mobile.clock.fastForward(76_000);
  assert.match(await mobile.locator('#message').textContent(), /Time is up.*1 of 3/);
  assert.equal(await mobile.locator('.tile:enabled').count(), 0);
  const timeoutRecap = mobile.getByRole('region', { name: 'Circuit recap' });
  assert.deepEqual(await timeoutRecap.locator('li').allTextContents(), [
    'GlasshousesAt par · 3 pulses · par 3',
    'TideworksUnfinished · 0 pulses · par 4',
    'Sky ArchiveNot reached · par 5',
  ]);
  await mobile.getByText('Practice', { exact: true }).tap();
  await mobile.getByRole('button', { name: 'Play again' }).tap();
  assert.equal(await timeoutRecap.isVisible(), false);
  await mobile.getByRole('button', { name: 'Start practice' }).tap();
  await mobile.getByRole('button', { name: 'Show hint' }).tap();
  assert.equal(await mobile.locator('.tile--hinted').count(), 1);
  await mobile.clock.fastForward(120_000);
  assert.equal(await mobile.locator('#timer').textContent(), '∞');
  assert.equal(await mobile.locator('.tile:enabled').count(), 16);
  await mobile.screenshot({ path: fileURLToPath(new URL('practice-mobile.png', artifacts)), fullPage: true });
  await mobile.getByRole('button', { name: 'Restart' }).tap();
  assert.equal(await mobile.locator('#moves').textContent(), '0');
  assert.equal(await mobile.locator('.tile:enabled').count(), 0);
  assert.deepEqual(errors, []);
  console.log('Passed desktop and touch UI checks: keyboard, solve, handoff, complete and partial recaps, best-score reload and untimed hints.');
} finally {
  await browser.close();
}
