import { test, expect, type Page } from '@playwright/test';

// Simulate a separate API client without adding proxy headers to external font requests.
test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => route.continue({ headers: { ...route.request().headers(), 'x-forwarded-for': '192.0.2.10' } }));
});

const widths = [320, 390, 768, 1024, 1279, 1280, 1440, 1536, 1920];
async function containedHeader(page: Page) {
  const result = await page.locator('header').evaluate(header => {
    const box = header.getBoundingClientRect();
    const buttons = Array.from(header.querySelectorAll('button')).filter(button => button.getClientRects().length > 0);
    return {
      insideViewport: box.left >= 0 && box.right <= innerWidth + 1,
      insideHeader: buttons.every(button => { const rect = button.getBoundingClientRect(); return rect.left >= box.left - 1 && rect.right <= box.right + 1 && rect.top >= box.top - 1 && rect.bottom <= box.bottom + 1; }),
      labelsFit: buttons.every(button => {
        const label = button.querySelector(':scope > span:not([aria-hidden])');
        if (!label || !label.getClientRects().length) return true;
        const rect = label.getBoundingClientRect(), parent = button.getBoundingClientRect();
        return rect.left >= parent.left - 1 && rect.right <= parent.right + 1;
      }),
      noPageOverflow: document.documentElement.scrollWidth <= innerWidth + 1,
    };
  });
  expect(result).toEqual({ insideViewport: true, insideHeader: true, labelsFit: true, noPageOverflow: true });
}
async function alignedPill(page: Page, section: string) {
  await expect.poll(async () => page.locator('header nav').evaluate((nav, id) => {
    const pill = nav.querySelector('[data-testid="navigation-highlight"]')!.getBoundingClientRect();
    const button = nav.querySelector(`[data-section="${id}"]`)!.getBoundingClientRect();
    return Math.max(Math.abs(pill.left - button.left), Math.abs(pill.width - button.width));
  }, section)).toBeLessThan(2);
}

for (const state of ['guest', 'member', 'team'] as const) {
  test(`header, login/profile controls, and mobile menu fit in both languages for ${state}`, async ({ page, context }) => {
    let inviteCode = '';
    if (state !== 'guest') {
      const fixture = await page.request.post('/__test/team', { data: { name: `Navigation ${test.info().project.name} ${state} ${Date.now()}`, userName: 'Alexandru'.repeat(10), withoutTeam: state === 'member' } });
      expect(fixture.status()).toBe(200);
      inviteCode = (await fixture.json()).inviteCode ?? '';
    }
    await page.goto('/');
    await expect(page.locator('#team')).toBeAttached();
    await page.evaluate(() => document.fonts.ready);
    for (const language of ['Română', 'English']) {
      await page.getByRole('button', { name: language, exact: true }).click();
      const ro = language === 'Română';
      for (const width of widths) {
        await page.setViewportSize({ width, height: 844 });
        await containedHeader(page);
        const header = page.locator('header');
        if (width >= 1280) {
          await expect(header.locator('nav')).toBeVisible();
          await alignedPill(page, 'hero');
          if (state === 'guest') await expect(header.getByRole('button', { name: ro ? 'AUTENTIFICARE' : 'SIGN IN', exact: true })).toBeVisible();
          else await expect(header.getByRole('button', { name: ro ? 'Contul Meu' : 'My account', exact: true })).toBeVisible();
        } else {
          const toggle = header.getByRole('button', { name: ro ? 'Deschide meniul' : 'Open menu', exact: true });
          await toggle.click();
          const menu = page.locator('#mobile-navigation');
          await expect(menu).toBeVisible();
          const bounds = await menu.evaluate(node => { const box = node.getBoundingClientRect(); return { inside: box.left >= 0 && box.right <= innerWidth + 1 && box.bottom <= innerHeight + 1, noOverflow: node.scrollWidth <= node.clientWidth + 1 }; });
          expect(bounds).toEqual({ inside: true, noOverflow: true });
          if (state === 'guest') await expect(menu.getByRole('button', { name: ro ? 'AUTENTIFICARE' : 'SIGN IN', exact: true })).toBeVisible();
          else await expect(menu.getByRole('button', { name: ro ? 'Deconectare' : 'Sign out', exact: true })).toBeAttached();
          await page.keyboard.press('Escape');
          await expect(menu).toBeHidden();
          await expect(toggle).toBeFocused();
        }
        if ([390, 1280, 1536].includes(width) && ro) await header.screenshot({ path: `/private/tmp/trivia-header-${test.info().project.name}-${state}-${width}.png` });
      }
    }
    await page.setViewportSize({ width: 390, height: 640 });
    await page.locator('header').getByRole('button', { name: 'Open menu', exact: true }).click();
    await page.locator('#mobile-navigation').getByRole('button', { name: 'Leaderboard', exact: true }).click();
    await expect(page.locator('#mobile-navigation')).toBeHidden();
    await expect.poll(() => page.locator('#leaderboard').evaluate(section => Math.abs(section.getBoundingClientRect().top - 100))).toBeLessThan(2);
    await page.locator('header').getByRole('button', { name: /TRANSILVANIA TRIVIA/ }).click();
    // Exercise the account action after resizing; the header must recover on logout too.
    await page.setViewportSize({ width: 1440, height: 900 });
    if (state === 'team') {
      await context.grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.locator('header').getByTitle('Copy the invitation code for your teammates').click();
      await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toBe(inviteCode);
      await containedHeader(page);
    }
    if (state === 'guest') {
      await page.locator('header').getByRole('button', { name: 'SIGN IN', exact: true }).click();
      await expect(page.getByRole('dialog')).toBeVisible();
    } else {
      await page.locator('header').getByRole('button', { name: 'My account', exact: true }).click();
      await expect(page).toHaveURL(/\/cont$/);
      await page.goto('/');
      await page.locator('header').getByRole('button', { name: 'Deconectare', exact: true }).click();
      await expect(page.locator('header').getByRole('button', { name: 'AUTENTIFICARE', exact: true })).toBeVisible();
      await containedHeader(page);
      await alignedPill(page, 'hero');
    }
  });
}

test('navigation highlight tracks every section, resizes, translates, and keeps its spring motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  const nav = page.locator('header nav');
  for (const section of ['hero', 'registration', 'games', 'leaderboard', 'rulebook', 'team', 'prizes']) {
    await nav.locator(`[data-section="${section}"]`).click();
    await alignedPill(page, section);
    await containedHeader(page);
  }
  await nav.locator('[data-section="hero"]').click();
  await alignedPill(page, 'hero');
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.locator('header').getByRole('button', { name: 'Deschide meniul', exact: true }).click();
  await page.setViewportSize({ width: 1536, height: 900 });
  await expect(page.locator('#mobile-navigation')).toBeHidden();
  await alignedPill(page, 'hero');
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await alignedPill(page, 'hero');
  await nav.locator('[data-section="leaderboard"]').click();
  await alignedPill(page, 'leaderboard');
  await page.locator('#leaderboard').screenshot({ path: `/private/tmp/trivia-navigation-section-${test.info().project.name}.png` });
});
