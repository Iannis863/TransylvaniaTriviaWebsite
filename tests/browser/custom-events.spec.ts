import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import type { CustomEventInput } from '../../shared/custom-events';

const adminHeaders = { 'X-Admin-Password': 'browser-test-admin', 'X-Forwarded-For': '192.0.2.42' };
const unique = () => `hermes-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const eventInput = (slug = unique()) => ({
  name: `Hermes ${slug}`, slug, title: 'Hermes — seara echipelor',
  subtitle: 'Un quiz pentru prieteni și colegi.', eventDate: '2090-12-01T17:30:00.000Z',
  venue: 'Sala Hermes', address: 'Strada Testului nr. 8', feeLabel: '25 lei / persoană',
  maxTeams: 2, isPublished: true, registrationOpen: true,
});
async function createEvent(request: APIRequestContext, input: CustomEventInput = eventInput()) {
  const response = await request.post('/api/admin/custom-events', { headers: adminHeaders, data: input });
  expect(response.status()).toBe(201);
  return { input, event: await response.json() };
}
async function bookGuest(page: Page, slug: string, name: string) {
  const form = page.locator('#registration');
  await form.getByLabel('Nume Echipă *', { exact: true }).fill(name);
  await form.getByLabel('Nume Căpitan *', { exact: true }).fill('Căpitan Hermes');
  await form.getByLabel('Adresă Email (pentru confirmare) *', { exact: true }).fill(`${unique()}@example.test`);
  const response = page.waitForResponse(r => r.url().endsWith(`/api/custom-events/${slug}/registrations`) && r.request().method() === 'POST');
  await form.locator('button[type="submit"]').click();
  const result = await response;
  expect(result.status()).toBe(201);
  return result.json();
}
async function noOverflow(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
}

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => route.continue({ headers: { ...route.request().headers(), 'x-forwarded-for': '192.0.2.42' } }));
});

test('custom page keeps authored details, books guests at fixed capacity, and closes without losing teams', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const { input, event } = await createEvent(page.request);
  await page.goto(`/${input.slug}`);
  await expect(page.getByTestId('custom-event-page')).toBeVisible();
  await expect(page.locator('h1')).toHaveText(input.title);
  await expect(page.getByText(input.subtitle, { exact: true })).toBeVisible();
  const details = page.getByTestId('custom-event-details');
  await expect(details).toContainText('19:30');
  await expect(details).toContainText(input.venue);
  await expect(details).toContainText(input.address);
  await expect(details).toContainText(input.feeLabel);
  for (const id of ['games', 'leaderboard', 'calendar', 'rulebook', 'team']) await expect(page.locator(`#${id}`)).toHaveCount(0);
  await expect(page.locator('nav')).toHaveCount(0);
  const prizes = page.getByTestId('custom-event-prizes');
  await expect(prizes).toBeAttached();
  for (const label of ['LOCUL I', 'LOCUL II', 'LOCUL III']) await expect(prizes.getByText(label, { exact: true })).toBeAttached();
  for (const name of ['Sticlă de Vin', 'Găleată de Bere', 'Rând de shoturi']) await expect(prizes.getByRole('heading', { name, exact: true })).toBeAttached();
  await expect(page.getByText(/Jackpot|1000 LEI/)).toHaveCount(0);
  const prizesAfterTeams = await prizes.evaluate(element => !!(element.compareDocumentPosition(document.querySelector('[data-testid="custom-event-teams"]')!) & Node.DOCUMENT_POSITION_PRECEDING));
  expect(prizesAfterTeams).toBe(true);
  for (const image of await page.getByTestId('custom-event-page').locator('img').all()) {
    await image.scrollIntoViewIfNeeded();
    await expect.poll(() => image.evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
  }
  const names = ['Prietenii lui Hermes', 'Colegi și curiozități', 'Echipa în așteptare'];
  for (let i = 0; i < names.length; i++) {
    const registration = await bookGuest(page, input.slug, names[i]);
    expect(registration.editionId).toBe(`event:${event.id}`);
    expect(registration.status).toBe(i < 2 ? 'CONFIRMED' : 'WAITLISTED');
    expect(registration.eventDate).toBe(input.eventDate);
    await expect(page.locator('#registration').getByText(i < 2 ? 'LOCUL VOSTRU ESTE CONFIRMAT!' : 'SUNTEȚI PE LISTA DE AȘTEPTARE', { exact: true })).toBeVisible();
    if (i < 2) await page.getByRole('button', { name: 'Înscrie O Altă Echipă', exact: true }).click();
  }
  const result = await (await page.request.get(`/api/custom-events/${input.slug}`)).json();
  expect(result).toMatchObject({ confirmedCount: 2, waitlistCount: 1, isFull: true, event: { maxTeams: 2 } });
  await expect(page.getByRole('heading', { name: names[0], exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: names[2], exact: true })).toHaveCount(0);
  const weekly = await (await page.request.get('/api/registrations/active')).json();
  expect(weekly.teams.some((team: { teamName: string }) => names.includes(team.teamName))).toBe(false);
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.locator('h1')).toHaveText(input.title);
  await expect(details).toContainText(input.feeLabel);
  await noOverflow(page);
  await page.screenshot({ path: `/private/tmp/custom-event-${test.info().project.name}.png`, fullPage: true });
  if (test.info().project.name === 'desktop') {
    for (const width of [320, 768, 1024]) {
      await page.setViewportSize({ width, height: 900 });
      await noOverflow(page);
    }
  }
  expect((await page.request.patch(`/api/admin/custom-events/${event.id}`, { headers: adminHeaders, data: { ...input, registrationOpen: false } })).status()).toBe(200);
  await page.reload();
  await expect(page.locator('#registration input')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: names[0], exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Înapoi la pagina principală', exact: true }).click();
  await expect(page.locator('h1')).toContainText('QUIZ SĂPTĂMÂNAL');
  expect(errors).toEqual([]);
});

test('captain bookings preserve team association and draft pages stay private', async ({ page }) => {
  const { input, event } = await createEvent(page.request);
  const name = `Echipa Hermes ${unique()}`;
  const team = await (await page.request.post('/__test/team', { data: { name } })).json();
  await page.goto(`/${input.slug}`);
  const response = page.waitForResponse(r => r.url().endsWith(`/api/custom-events/${input.slug}/registrations`) && r.request().method() === 'POST');
  await page.locator('#registration').getByRole('button', { name: '1-CLICK ÎNSCRIERE ECHIPĂ', exact: true }).click();
  const registration = await (await response).json();
  expect(registration).toMatchObject({ teamId: team.id, teamName: name, status: 'CONFIRMED', editionId: `event:${event.id}` });
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await noOverflow(page);
  const draft = await createEvent(page.request, { ...eventInput(), isPublished: false });
  await page.goto(`/${draft.input.slug}`);
  await expect(page.getByRole('heading', { name: /404/ })).toBeVisible();
  expect((await page.request.get(`/api/custom-events/${draft.input.slug}`)).status()).toBe(404);
});

test('maximum-length event text wraps on narrow screens and a failed request offers retry', async ({ page }) => {
  const input = { ...eventInput(), name: 'N'.repeat(120), title: 'T'.repeat(200), subtitle: 'S'.repeat(1000), venue: 'V'.repeat(160), address: 'A'.repeat(240), feeLabel: 'F'.repeat(160) };
  await createEvent(page.request, input);
  await page.setViewportSize({ width: 320, height: 844 });
  await page.route(`**/api/custom-events/${input.slug}`, route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Unavailable"}' }));
  await page.goto(`/${input.slug}`);
  await expect(page.getByRole('heading', { name: 'Evenimentul nu a putut fi încărcat.', exact: true })).toBeVisible();
  await page.unroute(`**/api/custom-events/${input.slug}`);
  await page.getByRole('button', { name: 'Reîncearcă', exact: true }).click();
  await expect(page.locator('h1')).toHaveText(input.title);
  await noOverflow(page);
  await bookGuest(page, input.slug, 'E'.repeat(100));
  await expect(page.locator('#registration').getByText('LOCUL VOSTRU ESTE CONFIRMAT!', { exact: true })).toBeVisible();
  await noOverflow(page);
  await expect(page.getByRole('heading', { name: 'E'.repeat(100), exact: true })).toBeVisible();
});

test('admin creates and publishes an event and explicitly accepts waiting teams after changing capacity', async ({ page }) => {
  await page.goto('/admin');
  await page.getByLabel('Parolă de Administrator', { exact: true }).fill('browser-test-admin');
  await page.getByRole('button', { name: 'Autentifică-te', exact: true }).click();
  await page.getByRole('button', { name: 'Evenimente speciale', exact: true }).click();
  await page.getByRole('button', { name: 'Creează eveniment', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const slug = unique();
  await dialog.getByLabel('Nume eveniment', { exact: true }).fill(`Eveniment ${slug}`);
  await dialog.getByLabel('Adresă pagină', { exact: true }).fill(slug);
  await dialog.getByLabel('Titlu pagină', { exact: true }).fill('O seară pentru Hermes');
  await dialog.getByLabel('Subtitlu pagină', { exact: true }).fill('Detalii stabilite de organizator.');
  await dialog.getByLabel('Data și ora (România)', { exact: true }).fill('2090-12-01T19:30');
  await dialog.getByLabel('Număr maxim de echipe', { exact: true }).fill('1');
  // Draft is the default; the resulting saved data is checked before publication.
  const savedResponse = page.waitForResponse(r => r.url().endsWith('/api/admin/custom-events') && r.request().method() === 'POST');
  await dialog.getByRole('button', { name: 'Salvează evenimentul', exact: true }).click();
  const created = await (await savedResponse).json();
  expect(created).toMatchObject({ slug, maxTeams: 1, isPublished: false, eventDate: '2090-12-01T17:30:00.000Z', venue: 'Insomnia Cafe & Bistro' });
  await expect(dialog).toBeHidden();
  const card = page.getByTestId(`custom-event-admin-${created.id}`);
  await card.getByRole('button', { expanded: false }).click();
  await card.getByRole('button', { name: 'Publică pagina', exact: true }).click();
  await expect(card.getByText('Publicat', { exact: true })).toBeVisible();
  const registrationData = (teamName: string) => ({ teamName, captainName: 'Test Captain', email: `${unique()}@example.test`, memberCount: 4 });
  const confirmedResponse = await page.request.post(`/api/custom-events/${slug}/registrations`, { data: registrationData('Hermes confirmat') });
  expect(confirmedResponse.status()).toBe(201);
  const confirmed = await confirmedResponse.json();
  const waitingResponse = await page.request.post(`/api/custom-events/${slug}/registrations`, { data: registrationData('Hermes așteptare') });
  expect(waitingResponse.status()).toBe(201);
  const waiting = await waitingResponse.json();
  expect(confirmed.status).toBe('CONFIRMED'); expect(waiting.status).toBe('WAITLISTED');
  await page.reload();
  await page.getByLabel('Parolă de Administrator', { exact: true }).fill('browser-test-admin');
  await page.getByRole('button', { name: 'Autentifică-te', exact: true }).click();
  await page.getByRole('button', { name: 'Evenimente speciale', exact: true }).click();
  await card.getByRole('button', { expanded: false }).click();
  const row = card.getByRole('row').filter({ hasText: 'Hermes așteptare' });
  await expect(row).toBeVisible();
  await card.getByRole('button', { name: 'Editează evenimentul', exact: true }).click();
  await dialog.getByLabel('Număr maxim de echipe', { exact: true }).fill('2');
  await dialog.getByRole('button', { name: 'Salvează evenimentul', exact: true }).click();
  await expect(dialog).toBeHidden();
  await expect(row).toContainText('În așteptare');
  await row.getByRole('button', { name: 'Acceptă echipa', exact: true }).click();
  await expect(row).toContainText('Acceptată');
  const publicEvent = await (await page.request.get(`/api/custom-events/${slug}`)).json();
  expect(publicEvent).toMatchObject({ confirmedCount: 2, waitlistCount: 0, event: { maxTeams: 2 } });
  await noOverflow(page);
  await card.screenshot({ path: `/private/tmp/custom-event-admin-${test.info().project.name}.png` });
});

test('admin uploads a collaborator PNG and prizes, preserves them on edits, and can disable collaboration', async ({ page }) => {
  const { readFile } = await import('node:fs/promises');
  const logo = await readFile('client/public/email-logo.png');
  const headers = { ...adminHeaders, 'X-Forwarded-For': '192.0.2.43' };
  await page.route('**/api/**', route => route.continue({ headers: { ...route.request().headers(), 'x-forwarded-for': '192.0.2.43' } }));
  const login = async () => {
    await page.goto('/admin');
    await page.getByLabel('Parolă de Administrator', { exact: true }).fill('browser-test-admin');
    await page.getByRole('button', { name: 'Autentifică-te', exact: true }).click();
    await page.getByRole('button', { name: 'Evenimente speciale', exact: true }).click();
  };
  await login();
  await page.getByRole('button', { name: 'Creează eveniment', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const slug = unique();
  await dialog.getByLabel('Nume eveniment', { exact: true }).fill(`Colaborare ${slug}`);
  await dialog.getByLabel('Adresă pagină', { exact: true }).fill(slug);
  await dialog.getByLabel('Data și ora (România)', { exact: true }).fill('2090-12-01T19:30');
  await dialog.getByLabel('Premiu pentru locul 1', { exact: true }).fill('Trofeul Hermes');
  await dialog.getByLabel('Descriere premiu pentru locul 1', { exact: true }).fill('Un trofeu pentru echipa câștigătoare.');
  await dialog.getByLabel('Eveniment în colaborare', { exact: true }).check();
  await dialog.getByLabel('Nume colaborator', { exact: true }).fill('Partenerul Hermes');
  await dialog.getByLabel('Logo colaborator (PNG, maximum 1 MB)', { exact: true }).setInputFiles({ name: 'partner.png', mimeType: 'image/png', buffer: logo });
  await expect(dialog.getByTestId('custom-event-logo-preview')).toHaveAttribute('src', /^data:image\/png;base64,/);
  await dialog.getByLabel('Pagină publicată', { exact: true }).check();
  const savedResponse = page.waitForResponse(r => r.url().endsWith('/api/admin/custom-events') && r.request().method() === 'POST');
  await dialog.getByRole('button', { name: 'Salvează evenimentul', exact: true }).click();
  const saved = await savedResponse;
  expect(saved.status()).toBe(201);
  const event = await saved.json();
  expect(event).toMatchObject({ isCollaboration: true, collaboratorName: 'Partenerul Hermes', prizes: { first: { title: 'Trofeul Hermes' } } });
  expect(event).not.toHaveProperty('collaboratorLogoData');
  await expect(dialog).toBeHidden();

  await page.goto(`/${slug}`);
  const logos = page.getByTestId('custom-event-logos');
  await expect(logos.locator('img')).toHaveCount(2);
  await expect.poll(() => logos.getByRole('img', { name: 'Partenerul Hermes', exact: true }).evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
  const imageResponse = await page.request.get(event.collaboratorLogoUrl);
  expect(imageResponse.status()).toBe(200);
  expect(imageResponse.headers()['content-type']).toMatch(/^image\/png/);
  expect(imageResponse.headers()['cache-control']).toContain('no-store');
  expect(await imageResponse.body()).toEqual(logo);
  const prizes = page.getByTestId('custom-event-prizes');
  await expect(prizes.getByRole('heading', { name: 'Trofeul Hermes', exact: true })).toBeAttached();
  await expect(page.getByText(/Jackpot|1000 LEI/)).toHaveCount(0);
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await noOverflow(page);
    const sideBySide = await logos.locator('img').evaluateAll(images => {
      const left = images[0].getBoundingClientRect(), right = images[1].getBoundingClientRect();
      return left.right <= right.left + 1 && Math.min(left.bottom, right.bottom) > Math.max(left.top, right.top);
    });
    expect(sideBySide).toBe(true);
  }
  await page.screenshot({ path: `/private/tmp/custom-event-collaboration-${test.info().project.name}.png`, fullPage: true });
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(prizes.getByRole('heading', { name: 'EVENT PRIZES', exact: true })).toBeAttached();
  await expect(prizes.getByRole('heading', { name: 'Trofeul Hermes', exact: true })).toBeAttached();
  await expect(logos.getByRole('img', { name: 'Partenerul Hermes', exact: true })).toBeVisible();

  await login();
  const card = page.getByTestId(`custom-event-admin-${event.id}`);
  await card.getByRole('button', { expanded: false }).click();
  await card.getByRole('button', { name: 'Editează evenimentul', exact: true }).click();
  await expect(dialog.getByTestId('custom-event-logo-preview')).toHaveAttribute('src', /^data:image\/png;base64,/);
  await dialog.getByLabel('Subtitlu pagină', { exact: true }).fill('Subtitlu actualizat.');
  await dialog.getByRole('button', { name: 'Salvează evenimentul', exact: true }).click();
  await expect(dialog).toBeHidden();
  const persisted = await (await page.request.get(`/api/custom-events/${slug}`)).json();
  expect(persisted.event).toMatchObject({ isCollaboration: true, prizes: { first: { title: 'Trofeul Hermes' } }, subtitle: 'Subtitlu actualizat.' });
  expect((await page.request.get(persisted.event.collaboratorLogoUrl)).status()).toBe(200);
  await card.getByRole('button', { name: 'Editează evenimentul', exact: true }).click();
  await dialog.getByLabel('Eveniment în colaborare', { exact: true }).uncheck();
  await dialog.getByRole('button', { name: 'Salvează evenimentul', exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.goto(`/${slug}`);
  await expect(page.getByTestId('custom-event-logos').locator('img')).toHaveCount(1);
  expect((await page.request.get(event.collaboratorLogoUrl)).status()).toBe(404);
  const current = await (await page.request.get(`/api/custom-events/${slug}`)).json();
  expect((await page.request.patch(`/api/admin/custom-events/${event.id}`, { headers, data: { ...current.event, isCollaboration: true } })).status()).toBe(200);
  expect((await page.request.get(`/api/custom-events/${slug}/collaborator-logo`)).status()).toBe(200);
});
