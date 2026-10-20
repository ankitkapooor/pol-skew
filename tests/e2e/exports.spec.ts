import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { completeRun } from './helpers';

const cases = [
  { button: 'PDF report', ext: '.pdf', magic: '%PDF' },
  { button: 'Share image', ext: '.png', magic: '\x89PNG' },
  { button: 'Square image', ext: '-square.png', magic: '\x89PNG' },
  { button: 'Text (.txt)', ext: '.txt', magic: 'Ideology Inventory: results' },
  { button: 'Your data (.json)', ext: '.json', magic: '{' },
];

test.describe('exports', () => {
  test.skip(({ isMobile }) => isMobile, 'download smoke tests run on desktop only');

  test('every export produces a non-empty file of the right type', async ({ page }, info) => {
    await completeRun(page);
    for (const c of cases) {
      const [dl] = await Promise.all([
        page.waitForEvent('download'),
        page.getByRole('button', { name: c.button }).click(),
      ]);
      expect(dl.suggestedFilename()).toMatch(
        new RegExp(`^ideology-inventory-\\d{4}-\\d{2}-\\d{2}${c.ext.replace('.', '\\.')}$`),
      );
      const path = info.outputPath(dl.suggestedFilename());
      await dl.saveAs(path);
      const buf = readFileSync(path);
      expect(buf.length, c.button).toBeGreaterThan(1000);
      expect(buf.subarray(0, c.magic.length).toString('latin1')).toBe(c.magic);
    }
  });

  test('text and JSON exports carry version, date, grade and the disclaimer', async ({ page }, info) => {
    await completeRun(page);
    const [dl] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Text (.txt)' }).click(),
    ]);
    const p = info.outputPath('r.txt');
    await dl.saveAs(p);
    const txt = readFileSync(p, 'utf8');
    expect(txt).toMatch(/Instrument:\s+\d+\.\d+\.\d+\+[0-9a-f]{8}/);
    expect(txt).toMatch(/Completed:\s+\d{4}-\d{2}-\d{2}/);
    expect(txt).toMatch(/Data quality:\s+(High|Moderate|Low)/);
    expect(txt).toContain(
      'Not a validated or norm-referenced instrument; 0 is the scale midpoint, not the average person.',
    );
  });
});
