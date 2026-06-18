// @ts-check
import { test, expect } from '@playwright/test';

// E2E coverage for the calm/overwhelm escape hatches reachable from /app:
// the Calm Companion chat (/app/calm) and the underwater breathing scene
// (/app/meditate).
//
// NOTE: like refill.spec.js, these need an authenticated session. The repo has
// no Playwright auth fixture yet, so they are skipped until that lands. They
// document the intended behaviour and the rule-6 invariant (no countdown timer).
test.describe('calm + meditation entry points', () => {
  test.skip(true, 'needs auth fixture (not yet scaffolded)');

  test('today page surfaces both calm entry points', async ({ page }) => {
    await page.goto('/app');
    await expect(page.getByRole('link', { name: /talk it down/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /just breathe/i })).toBeVisible();
  });

  test('calm companion opens with a gentle, non-task greeting', async ({ page }) => {
    await page.goto('/app/calm');
    await expect(page.getByRole('heading', { name: /take some weight off/i })).toBeVisible();
    await expect(page.getByLabel(/message to the calm companion/i)).toBeVisible();
  });

  test('meditation scene shows a breathing guide and an elapsed (count-up) clock, never a countdown', async ({ page }) => {
    await page.goto('/app/meditate');
    await expect(page.getByText(/breathe in|hold|breathe out/i)).toBeVisible();
    // Elapsed indicator counts UP from 00:00 — rule 6 forbids countdowns.
    await expect(page.getByText('00:00')).toBeVisible();
    await expect(page.getByRole('button', { name: /sea sounds/i })).toBeVisible();
  });
});
