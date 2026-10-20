import { expect, test, type Page } from '@playwright/test';

async function finishQuiz(page: Page): Promise<void> {
  for (let i = 0; i < 69; i++) await page.keyboard.press('3');
  await expect(page.locator('.verdict h1')).toBeVisible();
}

async function collection(page: Page, failFirst = false) {
  const submissions: Record<string, unknown>[] = [];
  let botLoads = 0;
  await page.route('**/api/config', (route) =>
    route.fulfill({ json: { collecting: true, turnstileSiteKey: 'test-site' } }),
  );
  await page.route('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit', (route) => {
    botLoads++;
    return route.fulfill({
      contentType: 'application/javascript',
      body: `window.turnstile = {
      render: (el, options) => { setTimeout(() => options.callback('fresh-test-token'), 0); return 'widget'; },
      remove: () => {}, reset: () => {}
    };`,
    });
  });
  await page.route('**/api/submissions', (route) => {
    submissions.push(route.request().postDataJSON() as Record<string, unknown>);
    return route.fulfill(
      failFirst && submissions.length === 1
        ? { status: 503, json: { error: 'Temporarily unavailable' } }
        : {
            status: 201,
            json: { id: '0d488d42-f06f-4b78-874f-ae398e5fa5a0', deletionCode: 'AAAA-BBBB-CCCC-DDDD' },
          },
    );
  });
  return { submissions, botLoads: () => botLoads };
}

async function accept(page: Page) {
  await page.getByRole('button', { name: 'Begin' }).click();
  await expect(page.locator('.statement')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Agree and begin' })).toBeDisabled();
  await page.locator('#start-consent').check();
  await expect(page.getByRole('button', { name: 'Agree and begin' })).toBeDisabled();
  await page.locator('#start-adult').check();
  await page.getByRole('button', { name: 'Agree and begin' }).click();
}

test('explicit consent before question 1 persists and submits once only on completion', async ({ page }) => {
  const server = await collection(page);
  await page.goto('/');
  await accept(page);
  expect(server.submissions).toHaveLength(0);
  expect(server.botLoads()).toBe(0);
  await page.keyboard.press('4');
  await page.reload();
  await page.getByRole('button', { name: /Resume/ }).click();
  await expect(page.getByText('Item 2 of 69')).toBeVisible();
  for (let i = 1; i < 69; i++) await page.keyboard.press('3');
  await expect(page.locator('#r-id')).toBeVisible();
  expect(server.submissions).toHaveLength(1);
  expect(server.botLoads()).toBe(1);
  expect(server.submissions[0]).toMatchObject({
    ageConfirmed: true,
    consentVersion: '2026-10-20',
    turnstileToken: 'fresh-test-token',
  });
  expect(Object.keys(server.submissions[0].answers as object)).toHaveLength(69);
  await page.reload();
  await page.getByRole('button', { name: 'View your last result' }).click();
  await expect(page.getByRole('heading', { name: 'Thanks for sharing' })).toBeVisible();
  expect(server.submissions).toHaveLength(1);
});

test('declining shares nothing and never loads a bot check', async ({ page }) => {
  const server = await collection(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Begin' }).click();
  await page.getByRole('button', { name: 'Continue without sharing' }).click();
  await finishQuiz(page);
  await expect(page.getByRole('heading', { name: 'Your responses stay private' })).toBeVisible();
  expect(server.submissions).toHaveLength(0);
  expect(server.botLoads()).toBe(0);
  await page.getByRole('button', { name: 'Retake' }).click();
  await expect(page.getByRole('heading', { name: 'May we use your anonymous responses?' })).toBeVisible();
  await expect(page.locator('#start-consent')).not.toBeChecked();
});

test('failed submission keeps results available and can be retried', async ({ page }) => {
  const server = await collection(page, true);
  await page.goto('/');
  await accept(page);
  await finishQuiz(page);
  await expect(page.locator('#share-status')).toHaveText('Temporarily unavailable');
  await expect(page.getByRole('button', { name: 'PDF report' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry sharing' }).click();
  await expect(page.locator('#r-code')).toHaveText('AAAA-BBBB-CCCC-DDDD');
  expect(server.submissions).toHaveLength(2);
});

test('an unavailable collection service does not claim consented collection is working', async ({ page }) => {
  await page.route('**/api/config', (route) =>
    route.fulfill({ json: { collecting: false, turnstileSiteKey: null } }),
  );
  await page.goto('/');
  await page.getByRole('button', { name: 'Begin' }).click();
  await page.locator('#start-consent').check();
  await page.locator('#start-adult').check();
  await expect(page.getByRole('button', { name: 'Agree and begin' })).toBeDisabled();
  await expect(page.locator('#consent-status')).toContainText('Sharing is temporarily unavailable');
  await page.getByRole('button', { name: 'Continue without sharing' }).click();
  await expect(page.getByText('Item 1 of 69')).toBeVisible();
});
