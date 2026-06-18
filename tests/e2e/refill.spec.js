// @ts-check
import { test, expect } from '@playwright/test';

// E2E coverage for the "refill as space clears" affordance on the today list.
//
// NOTE: this suite needs an authenticated session with seeded tasks. The repo
// does not yet ship an auth fixture / DB seed for Playwright (tests/e2e was
// empty before this feature), so these are skipped until that scaffolding
// lands. They document the intended behaviour and the cap invariant (rule #4).
test.describe('today list refill', () => {
  test.skip(true, 'needs auth fixture + seeded tasks (not yet scaffolded)');

  test('offers to pull the next task only when a slot is free', async ({ page }) => {
    // Seed: 2 today tasks + >=1 pending. One slot free -> button visible.
    await page.goto('/app');
    await expect(page.getByRole('button', { name: /pull the next one over/i })).toBeVisible();
  });

  test('refill never shows more than three task cards', async ({ page }) => {
    // Seed: 0 today tasks + many pending. Clicking refill tops up to 3, no more.
    await page.goto('/app');
    await page.getByRole('button', { name: /pull the next one over/i }).click();
    await expect(page.locator('section >> text=Today')).toBeVisible();
    const cards = page.getByRole('button', { name: /^Start session for/i });
    expect(await cards.count()).toBeLessThanOrEqual(3);
  });

  test('hides the button and shows the gentle hint when today is full', async ({ page }) => {
    // Seed: 3 today tasks + pending. No free slot -> no button, hint instead.
    await page.goto('/app');
    await expect(page.getByRole('button', { name: /pull the next one over/i })).toHaveCount(0);
    await expect(page.getByText(/more ready when you are/i)).toBeVisible();
  });
});
