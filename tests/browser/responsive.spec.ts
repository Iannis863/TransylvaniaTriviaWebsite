import { test, expect, type Locator, type Page } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => route.continue({ headers: { ...route.request().headers(), 'x-forwarded-for': '192.0.2.66' } }));
});

async function fitsDialog(dialog: Locator) {
  await expect.poll(() => dialog.evaluate(node => {
    const box = node.getBoundingClientRect();
    return box.top >= 0 && box.bottom <= innerHeight + 1 && box.left >= 0 && box.right <= innerWidth + 1 && node.scrollWidth <= node.clientWidth + 1;
  })).toBe(true);
}

async function noPageOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

test('secret clue and confirmation dialogs remain reachable on narrow and landscape screens', async ({ page }) => {
  await page.goto('/');
  for (const language of ['Română', 'English']) {
    await page.getByRole('button', { name: language, exact: true }).click();
    const ro = language === 'Română';
    for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }]) {
      await page.setViewportSize(viewport);
      await page.locator('#games').getByRole('button', { name: ro ? /VERIFICĂ STAREA LACĂTULUI/ : /CHECK THE LOCK/ }).click();
      const clue = page.getByRole('dialog');
      await expect(clue).toBeVisible();
      await fitsDialog(clue);
      const back = clue.getByRole('button', { name: ro ? 'ÎNAPOI LA JOCURI' : 'BACK TO GAMES', exact: true });
      await back.scrollIntoViewIfNeeded();
      await back.click();
      await expect(clue).toBeHidden();

      await page.locator('#games').getByRole('button', { name: ro ? 'Resetează (0/5)' : 'Reset (0/5)', exact: true }).click();
      const confirmation = page.getByRole('alertdialog');
      await expect(confirmation).toBeVisible();
      await fitsDialog(confirmation);
      const cancel = confirmation.getByRole('button', { name: ro ? 'Anulează' : 'Cancel', exact: true });
      await cancel.scrollIntoViewIfNeeded();
      await cancel.click();
      await expect(confirmation).toBeHidden();
    }
  }
});

test('footer text and logo stay inside the viewport at phone, tablet and desktop sizes', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  for (const language of ['Română', 'English']) {
    await page.getByRole('button', { name: language, exact: true }).click();
    for (const width of [320, 390, 768, 1024, 1280, 2560]) {
      await page.setViewportSize({ width, height: 844 });
      const footer = page.locator('footer');
      await footer.scrollIntoViewIfNeeded();
      await expect.poll(() => footer.evaluate(node => Array.from(node.querySelectorAll('div, span, a, img')).every(child => {
        const box = child.getBoundingClientRect();
        return box.left >= 0 && box.right <= innerWidth + 1;
      }))).toBe(true);
      await noPageOverflow(page);
    }
  }
});

test('an unlocked long clue wraps and its closing action remains reachable', async ({ page }) => {
  const fixture = await page.request.post('/__test/team', { data: { name: 'Clue layout team', userName: 'Clue layout captain' } });
  expect(fixture.ok()).toBe(true);
  const secret = 'W'.repeat(2000);
  await page.route('**/api/games/progress/**', route => route.fulfill({ json: {
    weekId: decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop()!),
    games: Object.fromEntries(['WORDLE', 'TARGET', 'TIMELINE', 'CONNECTIONS', 'GLOBLE'].map(game => [game, { isSolved: true }])),
  } }));
  await page.route('**/api/editions/*/clue*', route => route.fulfill({ json: { clue: secret } }));
  await page.goto('/');
  for (const language of ['Română', 'English']) {
    await page.getByRole('button', { name: language, exact: true }).click();
    const ro = language === 'Română';
    for (const viewport of [{ width: 320, height: 568 }, { width: 568, height: 320 }, { width: 2560, height: 900 }]) {
      await page.setViewportSize(viewport);
      await page.locator('#games').getByRole('button', { name: ro ? /DESCHIDE PERGAMENTUL SECRET/ : /OPEN THE SECRET SCROLL/ }).click();
      const clue = page.getByRole('dialog');
      await expect(clue.getByText(`"${secret}"`, { exact: true })).toBeVisible();
      await fitsDialog(clue);
      const close = clue.getByRole('button', { name: ro ? 'AM REȚINUT SECRETUL' : 'GOT THE SECRET', exact: true });
      await close.scrollIntoViewIfNeeded();
      await close.click();
      await expect(clue).toBeHidden();
    }
  }
});

test('long valid team and theme names fit account, shared progress and public team cards', async ({ page }) => {
  const name = `${'W'.repeat(80)}${Date.now()}`;
  const fixture = await page.request.post('/__test/team', { data: { name, userName: 'Layout Captain' } });
  expect(fixture.ok()).toBe(true);
  const team = await fixture.json();
  const booking = await page.request.post('/api/registrations', { data: { teamId: team.id, teamName: name, captainName: 'Layout Captain', email: `layout-${Date.now()}@example.test`, memberCount: 6 } });
  expect(booking.status()).toBe(201);
  await page.route('**/api/auth/me/theme-suggestions', route => route.fulfill({ json: [{ id: 'layout-theme', themeName: 'M'.repeat(100), popularityScore: 5, status: 'PENDING', createdAt: null }] }));

  for (const width of [320, 768, 2560]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/cont');
    await expect(page.getByLabel('Nume', { exact: true })).toHaveValue('Layout Captain');
    await expect(page.getByText('M'.repeat(100), { exact: true })).toBeVisible();
    await noPageOverflow(page);

    await page.goto('/');
    await expect(page.locator('#team h2')).toHaveText(name);
    await expect(page.locator('h4').filter({ hasText: name })).toHaveCount(1);
    await noPageOverflow(page);
    const card = page.locator('h4').filter({ hasText: name }).locator('../..');
    expect(await card.evaluate(node => node.scrollWidth <= node.clientWidth + 1)).toBe(true);
  }
});
