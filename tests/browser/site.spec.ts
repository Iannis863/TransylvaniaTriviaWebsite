import { test, expect, type Page } from '@playwright/test';

const unique = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
async function openAuth(page: Page) {
  await page.locator('#team').getByRole('button', { name: 'AUTENTIFICARE / ÎNREGISTRARE', exact: true }).click();
  return page.getByRole('dialog');
}
async function registerAccount(page: Page, name: string, email: string) {
  const dialog = page.getByRole('dialog');
  if (!await dialog.isVisible()) await openAuth(page);
  await dialog.getByRole('tab', { name: 'Cont Nou', exact: true }).click();
  await dialog.getByLabel('Nume / Nickname', { exact: true }).fill(name);
  await dialog.getByLabel('Email', { exact: true }).fill(email);
  await dialog.getByLabel('Parolă', { exact: true }).fill('audit-password-123');
  const response = page.waitForResponse(r => r.url().endsWith('/api/auth/register') && r.request().method() === 'POST');
  await dialog.getByRole('button', { name: 'CREEAZĂ CONTUL', exact: true }).click();
  expect((await response).status()).toBe(201);
  await expect(dialog).toBeHidden();
}
async function fillBooking(page: Page, teamName: string, email: string) {
  const form = page.locator('#registration');
  await form.getByLabel('Nume Echipă *', { exact: true }).fill(teamName);
  await form.getByLabel('Nume Căpitan *', { exact: true }).fill('Căpitan Test');
  await form.getByLabel('Adresă Email (pentru confirmare) *', { exact: true }).fill(email);
  return form;
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

test('public sections, bilingual controls, calendar, responsive assets, and 404 recovery', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'ro');
  await expect(page.locator('h1')).toContainText('QUIZ SĂPTĂMÂNAL');
  await noOverflow(page);
  for (const id of ['registration', 'games', 'rulebook', 'team', 'prizes']) await expect(page.locator(`#${id}`)).toBeAttached();
  await page.getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: /^(Close|Închide)$/ }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('h1')).toContainText('WEEKLY QUIZ');
  await noOverflow(page);
  await page.locator('#prizes').scrollIntoViewIfNeeded();
  for (const image of await page.locator('#prizes img').all()) {
    await expect(image).toHaveAttribute('src', /\.webp$/);
    await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
  }
  await page.goto('/missing-audit-page');
  await expect(page.getByRole('heading', { name: /404/ })).toBeVisible();
  await page.getByRole('link', { name: 'Eveniment', exact: true }).click();
  await expect(page.locator('h1')).toContainText('QUIZ SĂPTĂMÂNAL');
  expect(errors).toEqual([]);
});

test('guest registration validates and saves a real booking without sending email', async ({ page }) => {
  await page.goto('/');
  const name = unique('Guest');
  const form = await fillBooking(page, name, `${name}@example.test`);
  await form.getByLabel('Nume Căpitan *', { exact: true }).fill(' ');
  await form.getByRole('button', { name: 'ÎNSCRIE ECHIPA', exact: true }).click();
  await expect(form.getByText('Numele căpitanului trebuie să aibă cel puțin 2 caractere', { exact: true })).toBeVisible();
  await form.getByLabel('Nume Căpitan *', { exact: true }).fill('Căpitan Test');
  const response = page.waitForResponse(r => r.url().endsWith('/api/registrations') && r.request().method() === 'POST');
  await form.getByRole('button', { name: 'ÎNSCRIE ECHIPA', exact: true }).click();
  const result = await response;
  expect(result.status()).toBe(201);
  expect(await result.json()).toMatchObject({ teamName: name, status: 'CONFIRMED', language: 'ro', emailStatus: 'pending' });
  await expect(form.getByText('LOCUL VOSTRU ESTE CONFIRMAT!', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await form.getByRole('button', { name: 'Înscrie O Altă Echipă', exact: true }).click();
  await expect(form.getByLabel('Nume Echipă *', { exact: true })).toHaveValue('');
});

test('account creation, team creation, captain booking, profile reload, logout and login', async ({ page }) => {
  await page.goto('/');
  const name = unique('Captain'); const email = `${name}@example.test`;
  await registerAccount(page, name, email);
  await page.locator('#team').getByRole('button', { name: 'FORMEAZĂ SAU INTRĂ ÎNTR-O ECHIPĂ', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Nume Echipă', { exact: true }).fill(name);
  await page.getByRole('dialog').getByRole('button', { name: 'FORMEAZĂ ECHIPA & GENEREAZĂ COD', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
  const me = await (await page.request.get('/api/auth/me')).json();
  expect(me.user.role).toBe('TEAM_LEADER'); expect(me.team.name).toBe(name);
  await noOverflow(page);
  await page.locator('#registration').getByRole('button', { name: '1-CLICK ÎNSCRIERE ECHIPĂ', exact: true }).click();
  await expect(page.locator('#registration').getByText('LOCUL VOSTRU ESTE CONFIRMAT!', { exact: true })).toBeVisible();
  await page.goto('/cont');
  await expect(page.getByLabel('Nume', { exact: true })).toHaveValue(name);
  await page.reload();
  await expect(page).toHaveURL(/\/cont$/);
  await expect(page.getByLabel('Nume', { exact: true })).toHaveValue(name);
  await expect(page.getByText('Acceptată · loc confirmat', { exact: true })).toBeVisible();
  await page.getByLabel('Nume', { exact: true }).fill(`${name} Updated`);
  await page.locator('form button[type="submit"]').click();
  await expect.poll(async () => (await (await page.request.get('/api/auth/me')).json()).user.name).toBe(`${name} Updated`);
  await page.getByRole('button', { name: 'Deconectare', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  expect((await page.request.get('/api/auth/me')).status()).toBe(401);
  const dialog = await openAuth(page);
  await dialog.getByLabel('Email', { exact: true }).fill(email);
  await dialog.getByLabel('Parolă', { exact: true }).fill('audit-password-123');
  await dialog.getByRole('button', { name: 'INTRĂ ÎN CONT', exact: true }).click();
  await expect(dialog).toBeHidden();
  expect((await page.request.get('/api/auth/me')).status()).toBe(200);
});

test('invitation link is consumed once after signup and preserves its destination', async ({ page, playwright }) => {
  const captain = await playwright.request.newContext({ baseURL: 'http://127.0.0.1:4177' });
  const name = unique('Invite');
  expect((await captain.post('/api/auth/register', { data: { name, email: `${name}@example.test`, password: 'audit-password-123' } })).status()).toBe(201);
  const team = await (await captain.post('/api/teams', { data: { name } })).json();
  let joins = 0;
  page.on('request', request => { if (request.url().endsWith('/api/teams/join')) joins++; });
  await page.goto(`/?join=${team.inviteCode}#team`);
  await expect(page.getByRole('dialog')).toBeVisible();
  await registerAccount(page, 'Invited Member', `${unique('member')}@example.test`);
  await expect.poll(async () => (await (await page.request.get('/api/auth/me')).json()).user.teamId).toBe(team.id);
  expect(joins).toBe(1);
  await expect(page).toHaveURL(/\/#team$/);
  await noOverflow(page);
  await captain.dispose();
});

test('password reset form accepts a test-issued code and revokes the old password', async ({ page }) => {
  const email = `${unique('reset')}@example.test`;
  expect((await page.request.post('/api/auth/register', { data: { name: 'Password Test', email, password: 'old-password' } })).status()).toBe(201);
  await page.request.post('/api/auth/logout');
  await page.goto('/');
  const dialog = await openAuth(page);
  await dialog.getByRole('button', { name: 'Ai uitat parola?', exact: true }).click();
  await dialog.getByLabel('Email', { exact: true }).fill(email);
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog.getByLabel('Cod de verificare', { exact: true })).toBeVisible();
  expect((await page.request.post('/__test/reset-code', { data: { email } })).ok()).toBe(true);
  await dialog.getByLabel('Cod de verificare', { exact: true }).fill('123456');
  await dialog.getByLabel('Parola nouă', { exact: true }).fill('new-password-123');
  await dialog.getByLabel('Confirmă parola nouă', { exact: true }).fill('new-password-123');
  await dialog.locator('button[type="submit"]').click();
  await expect(dialog.getByText('Parola a fost schimbată cu succes!', { exact: true })).toBeVisible();
  expect((await page.request.post('/api/auth/login', { data: { email, password: 'old-password' } })).status()).toBe(401);
  expect((await page.request.post('/api/auth/login', { data: { email, password: 'new-password-123' } })).status()).toBe(200);
});

test('all games load in both languages and switching tabs retains unfinished input', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#games');
  const games = page.locator('#games');
  await games.getByRole('button', { name: 'A', exact: true }).click();
  await games.getByRole('tab', { name: 'Atinge Ținta', exact: true }).click();
  await games.getByRole('button', { name: 'Indiciu', exact: true }).click();
  await games.getByRole('tab', { name: 'Cronologie', exact: true }).click();
  await expect(games.getByRole('tabpanel').filter({ visible: true })).toBeVisible();
  await games.getByRole('tab', { name: 'Conexiuni', exact: true }).click();
  await games.getByRole('tab', { name: 'Ghicește Țara', exact: true }).click();
  await expect(games.getByLabel('Numele țării', { exact: true })).toBeVisible();
  await games.getByRole('tab', { name: 'Wordle', exact: true }).click();
  await expect(games.getByRole('tabpanel').filter({ visible: true }).getByText('A', { exact: true })).toHaveCount(2);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  for (const name of ['Reach the Target', 'Timeline', 'Connections', 'Guess the Country', 'Wordle']) {
    await games.getByRole('tab', { name, exact: true }).click();
    await expect(games.getByRole('tabpanel').filter({ visible: true })).toBeVisible();
    await noOverflow(page);
  }
  expect(errors).toEqual([]);
});

test('a failed teams request shows retry and recovers without reporting an empty event', async ({ page }) => {
  await page.route('**/api/registrations/active*', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Unavailable"}' }));
  await page.goto('/');
  await expect(page.getByRole('alert').filter({ hasText: 'Lista echipelor nu a putut fi actualizată.' })).toBeVisible();
  await expect(page.getByText('Încă nu s-a înregistrat nicio echipă.', { exact: true })).toBeHidden();
  await page.unroute('**/api/registrations/active*');
  await page.getByRole('alert').getByRole('button', { name: 'Reîncearcă', exact: true }).click();
  await expect(page.getByRole('alert').filter({ hasText: 'Lista echipelor nu a putut fi actualizată.' })).toBeHidden();
});

test('waitlist signup and admin approval work; all bilingual email previews render', async ({ page }) => {
  await page.request.post('/__test/capacity', { data: { full: true } });
  try {
    await page.goto('/');
    const name = unique('Waitlist');
    const form = await fillBooking(page, name, `${name}@example.test`);
    const response = page.waitForResponse(r => r.url().endsWith('/api/registrations') && r.request().method() === 'POST');
    await form.locator('button[type="submit"]').click();
    const registration = await (await response).json();
    expect(registration.status).toBe('WAITLISTED');
    await expect(form.getByText('SUNTEȚI PE LISTA DE AȘTEPTARE', { exact: true })).toBeVisible();
    await page.goto('/admin');
    await page.getByLabel('Parolă de Administrator', { exact: true }).fill('wrong-password');
    await page.getByRole('button', { name: 'Autentifică-te', exact: true }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await page.getByLabel('Parolă de Administrator', { exact: true }).fill('browser-test-admin');
    await page.getByRole('button', { name: 'Autentifică-te', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Emailuri', exact: true })).toBeVisible();
    const schedule = await (await page.request.get('/api/schedule/current')).json();
    await page.locator('button[aria-expanded]').filter({ has: page.getByText(`S${schedule.seasonNumber} · E${schedule.editionNumber}`, { exact: true }) }).click();
    const row = page.getByRole('row').filter({ hasText: name });
    await row.getByRole('button', { name: 'Acceptă echipa', exact: true }).click();
    await expect(row.getByRole('button', { name: 'Acceptă echipa', exact: true })).toBeHidden();
    await expect(row.getByRole('cell').filter({ hasText: /^Acceptată/ })).toBeVisible();
    await row.getByRole('button', { name: 'Editează', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Telefon', { exact: true }).fill('0700000000');
    await page.getByRole('dialog').getByRole('button', { name: 'Salvează', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeHidden();
    const active = await (await page.request.get('/api/registrations/active')).json();
    expect(active.teams.some((team: any) => team.id === registration.id)).toBe(true);
    await page.getByRole('button', { name: 'Emailuri', exact: true }).click();
    for (const language of ['Română', 'English']) {
      await page.getByRole('button', { name: language, exact: true }).click();
      const select = page.locator('select');
      await expect(select.locator('option')).toHaveCount(10);
      for (let i = 0; i < 9; i++) {
        await select.selectOption(`template:${i}`);
        await expect(page.frameLocator('iframe').locator('img')).toHaveAttribute('src', /email-logo\.png/);
        await expect(page.frameLocator('iframe').locator('html')).toHaveAttribute('lang', language === 'Română' ? 'ro' : 'en');
        await expect.poll(() => page.frameLocator('iframe').locator('img').evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
      }
    }
    await noOverflow(page);
  } finally { await page.request.post('/__test/capacity', { data: { full: false } }); }
});


test('a failed lazy route offers a working page-reload recovery', async ({ page }) => {
  await page.route('**/assets/AdminPanel-*.js', route => route.abort());
  await page.goto('/admin');
  await expect(page.getByRole('heading', { name: 'Pagina nu a putut fi încărcată.', exact: true })).toBeVisible();
  await page.unroute('**/assets/AdminPanel-*.js');
  await page.getByRole('button', { name: 'Reîncarcă pagina', exact: true }).click();
  await expect(page.getByLabel('Parolă de Administrator', { exact: true })).toBeVisible();
});
