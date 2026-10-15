import { test, expect, type Locator } from '@playwright/test';

async function fitsHorizontally(locator: Locator) {
  const bounds = await locator.evaluate(node => {
    const box = node.getBoundingClientRect();
    return { left: box.left, right: box.right, viewport: innerWidth, content: node.scrollWidth, width: node.clientWidth, label: node.textContent?.slice(0, 100) };
  });
  expect(bounds.left).toBeGreaterThanOrEqual(-1);
  expect(bounds.right).toBeLessThanOrEqual(bounds.viewport + 1);
  expect(bounds.content, `Content fits: ${bounds.label}`).toBeLessThanOrEqual(bounds.width + 1);
}

for (const width of [320, 768, 1024, 2560]) {
  test(`public forms, game controls and calendar fit at ${width}px in both languages`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'Explicit viewport matrix runs once.');
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width, height: width === 320 ? 568 : 900 });
    await page.goto('/');
    await page.evaluate(() => document.fonts.ready);

    for (const language of ['Română', 'English']) {
      await page.getByRole('button', { name: language, exact: true }).click();
      const romanian = language === 'Română';
      const snapshot = `/private/tmp/trivia-final-${width}-${romanian ? 'ro' : 'en'}`;
      await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
      await page.screenshot({ path: `${snapshot}-home.png` });
      const registration = page.locator('#registration');
      await registration.scrollIntoViewIfNeeded();
      for (const control of await registration.locator('input, button[type="submit"], [role="combobox"]').all()) {
        await fitsHorizontally(control);
      }

      const games = page.locator('#games');
      for (const name of romanian
        ? ['Wordle', 'Atinge Ținta', 'Cronologie', 'Conexiuni', 'Ghicește Țara']
        : ['Wordle', 'Reach the Target', 'Timeline', 'Connections', 'Guess the Country']) {
        await games.getByRole('tab', { name, exact: true }).click();
        const panel = games.getByRole('tabpanel').filter({ visible: true });
        await expect(panel).toBeVisible();
        await expect(panel.getByRole('status').filter({ hasText: /Se încarcă|Loading/ })).toHaveCount(0);
        await fitsHorizontally(panel);
        for (const control of await panel.locator('button:visible, input:visible').all()) {
          await fitsHorizontally(control);
        }
        if (name === 'Wordle') await panel.screenshot({ path: `${snapshot}-wordle.png` });
      }

      await page.getByRole('button', { name: 'Calendar', exact: true }).click();
      const calendar = page.getByRole('dialog');
      await expect(calendar).toBeVisible();
      await fitsHorizontally(calendar);
      await expect(calendar.locator('time')).toHaveCount(15);
      await calendar.screenshot({ path: `${snapshot}-calendar.png` });
      await calendar.getByRole('button', { name: /^(Close|Închide)$/ }).click();
      await expect(calendar).toBeHidden();

      await page.locator('#team').getByRole('button', {
        name: romanian ? 'AUTENTIFICARE / ÎNREGISTRARE' : 'SIGN IN / REGISTER', exact: true,
      }).click();
      const auth = page.getByRole('dialog');
      await expect(auth).toBeVisible();
      await fitsHorizontally(auth);
      await auth.screenshot({ path: `${snapshot}-auth.png` });
      await page.keyboard.press('Escape');
      await expect(auth).toBeHidden();
      await page.locator('footer').screenshot({ path: `${snapshot}-footer.png` });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}
