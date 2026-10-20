import type { Page } from '@playwright/test';

/** Answers every screen by keyboard: passes both checks, varies the rest. */
export async function completeRun(page: Page): Promise<void> {
  await page.goto('/?norms=fixture');
  await page
    .getByRole('button', { name: /Begin|Retake|Start over/ })
    .first()
    .click();
  for (let i = 0; i < 69; i++) {
    const text = (await page.locator('.statement').textContent()) ?? '';
    const key = text.includes('Somewhat disagree')
      ? '2'
      : text.includes('phone or a computer')
        ? '1'
        : text.includes('Overall')
          ? '4'
          : String(1 + ((i * 3) % 5));
    await page.keyboard.press(key);
  }
  await page.locator('.verdict h1').waitFor();
}
