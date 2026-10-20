/** Regenerates README screenshots: `npx tsx scripts/screenshots.ts` with `npm run dev -- --port 5174` running. */
import { chromium } from '@playwright/test';
import { ITEMS, byId, wordCount } from '../src/instrument/items';
import { mulberry32, newOrder } from '../src/instrument/order';
import { INSTRUMENT_VERSION } from '../src/instrument/version';

/** A plausible, high-quality example run (left-leaning economics, mildly progressive, civil-libertarian). */
function exampleRun() {
  const rng = mulberry32(2026);
  const lean: Record<string, number> = {
    econ: -0.9,
    social: -0.5,
    auth: -0.6,
    climate: -0.4,
    global: 0.3,
    populism: 0.2,
  };
  const answers: Record<string, number> = { AC: 2, IF: 1, SP: 3 };
  for (const it of ITEMS) {
    const base = 'dir' in it ? 3 + 1.6 * lean[it.dim] * it.dir : 3.4;
    answers[it.id] = Math.min(5, Math.max(1, Math.round(base + (rng() - 0.5) * 2.2)));
  }
  const order = newOrder(rng);
  const times: Record<string, number> = {};
  const words: Record<string, number> = {};
  for (const id of order) {
    words[id] = wordCount(byId(id).text);
    times[id] = 1500 + words[id] * 260 + rng() * 2500;
  }
  return {
    order,
    idx: order.length - 1,
    answers,
    times,
    words,
    done: true,
    version: INSTRUMENT_VERSION,
    completedOn: '2026-10-20',
  };
}

const base = process.env.BASE_URL ?? 'http://localhost:5174';
const out = (n: string) => `docs/screenshots/${n}.png`;

const browser = await chromium.launch();
for (const scheme of ['light', 'dark'] as const) {
  const ctx = await browser.newContext({
    baseURL: base,
    viewport: { width: 1100, height: 900 },
    colorScheme: scheme,
    deviceScaleFactor: 2,
    reducedMotion: 'reduce',
  });
  const page = await ctx.newPage();
  await page.goto('/');
  await page.screenshot({ path: out(`intro-${scheme}`) });
  await page.getByRole('button', { name: 'Begin' }).click();
  await page.keyboard.press('4');
  await page.screenshot({ path: out(`question-${scheme}`) });
  await page.evaluate(
    (run) => localStorage.setItem('ideology-inventory-v2', JSON.stringify(run)),
    exampleRun(),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'View your last result' }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: out(`results-${scheme}`), fullPage: false });
  await ctx.close();
}
const ctx = await browser.newContext({
  baseURL: base,
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  reducedMotion: 'reduce',
});
const page = await ctx.newPage();
await page.goto('/');
await page.getByRole('button', { name: 'Begin' }).click();
await page.screenshot({ path: out('question-mobile') });
await browser.close();
console.log('Screenshots written to docs/screenshots/');
