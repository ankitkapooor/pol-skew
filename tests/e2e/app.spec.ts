import { expect, test } from '@playwright/test';
import { completeRun } from './helpers';

test('intro explains the instrument and promises local-only answers', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Where do your views actually sit?');
  await expect(page.getByText('Example result, not yours')).toBeVisible();
  await expect(page.getByText('Your answers stay in this browser.')).toBeVisible();
});

test('full run reaches results with honest labelling', async ({ page }) => {
  await completeRun(page);
  await expect(page.getByText('0 is the middle of the scale, not the average person.')).toBeVisible();
  await expect(page.locator('.chip').first()).toContainText('Data quality');
  await expect(page.getByRole('heading', { name: 'Short scales' })).toBeVisible();
  // No horizontal page scroll at any viewport.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
});

test('progress survives a reload and Previous goes back', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Begin' }).click();
  await page.keyboard.press('4');
  await page.keyboard.press('2');
  await expect(page.getByText('Item 3 of 69')).toBeVisible();
  await page.keyboard.press('ArrowLeft');
  await expect(page.getByText('Item 2 of 69')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: /Resume \(2 of 69 answered\)/ })).toBeVisible();
});

test('benchmark module runs in original format with synthetic norms in dev', async ({ page }) => {
  await completeRun(page);
  await page.getByRole('button', { name: /Compare with Americans/ }).click();
  await expect(page.getByText(/U\.S\. benchmark · 1 of 11/)).toBeVisible();
  for (let i = 0; i < 16 && (await page.locator('.bstatement').count()); i++) await page.keyboard.press('1');
  await expect(page.getByRole('heading', { name: 'Compared with Americans' })).toBeVisible();
  await expect(page.getByText('Synthetic test data, not real survey results.')).toBeVisible();
  await expect(
    page.getByText(/More economically (left|right) than about \d+% of U\.S\. adult citizens/),
  ).toBeVisible();
});
