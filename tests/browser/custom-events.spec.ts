import { test, expect, type Page, type APIRequestContext } from '@playwright/test';
import type { CustomEventInput } from '../../shared/custom-events';
import { createDeflate, deflateSync } from 'node:zlib';
import { Readable } from 'node:stream';
import { pngCrc32 } from '../../server/custom-event-logo';

function pngFromCompressedRows(width: number, height: number, compressed: Buffer) {
  const chunk = (type: string, bytes: Buffer) => {
    const result = Buffer.alloc(bytes.length + 12);
    result.writeUInt32BE(bytes.length); result.write(type, 4); bytes.copy(result, 8);
    result.writeUInt32BE(pngCrc32(result.subarray(4, result.length - 4)), result.length - 4);
    return result;
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width); header.writeUInt32BE(height, 4); header[8] = 8; header[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header), chunk('IDAT', compressed), chunk('IEND', Buffer.alloc(0))]);
}
function pngFromRows(width: number, height: number, rows: Buffer) {
  return pngFromCompressedRows(width, height, deflateSync(rows));
}
let hugeLogoFixture: Promise<Buffer> | undefined;
function hugeLogoPng() {
  return hugeLogoFixture ??= (async () => {
    const size = 10660, inset = 1800;
    const emptyRow = Buffer.alloc(size * 4 + 1), artworkRow = Buffer.alloc(size * 4 + 1);
    for (let x = inset; x < size - inset; x++) artworkRow.writeUInt32BE(0x22aa77ff, 1 + x * 4);
    // Reuse two immutable rows and stream zlib input rather than allocate a 454 MB raster.
    const rows = Readable.from((function* () {
      for (let y = 0; y < size; y++) yield y < inset || y >= size - inset ? emptyRow : artworkRow;
    })());
    const chunks: Buffer[] = [];
    for await (const chunk of rows.pipe(createDeflate())) chunks.push(chunk as Buffer);
    return pngFromCompressedRows(size, size, Buffer.concat(chunks));
  })();
}
function paddedWordmarkPng() {
  const width = 5000, height = 2000;
  const rows = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 500; y < 1500; y++) for (let x = 1000; x < 4000; x++) {
    const alpha = x < 1012 || x >= 3988 || y < 512 || y >= 1488 ? 128 : 255;
    rows.writeUInt32BE((0xf6b82800 + alpha) >>> 0, y * (width * 4 + 1) + 1 + x * 4);
  }
  return pngFromRows(width, height, rows);
}
function detailedPng() {
  const size = 1280, rows = Buffer.alloc((size * 4 + 1) * size);
  let seed = 413;
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
    rows.writeUInt32BE((((seed & 0xffffff) << 8) | 255) >>> 0, y * (size * 4 + 1) + 1 + x * 4);
  }
  return pngFromRows(size, size, rows);
}

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
  await dialog.getByLabel('Logo colaborator (PNG)', { exact: true }).setInputFiles({ name: 'partner.png', mimeType: 'image/png', buffer: logo });
  await expect(dialog.getByTestId('custom-event-logo-preview')).toHaveAttribute('src', /^data:image\/png;base64,/);
  await dialog.getByLabel('Pagină publicată', { exact: true }).check();
  const savedResponse = page.waitForResponse(r => r.url().endsWith('/api/admin/custom-events') && r.request().method() === 'POST');
  await dialog.getByRole('button', { name: 'Salvează evenimentul', exact: true }).click();
  const saved = await savedResponse;
  expect(saved.status()).toBe(201);
  const event = await saved.json();
  const processedLogo = Buffer.from(saved.request().postDataJSON().collaboratorLogoData.split(',')[1], 'base64');
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
  expect(await imageResponse.body()).toEqual(processedLogo);
  expect(processedLogo.readUInt32BE(16)).toBe(processedLogo.readUInt32BE(20));
  expect(processedLogo.readUInt32BE(16)).toBeLessThanOrEqual(1024);
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

test('large logo originals are optimized automatically with transparency, centered padding, and proportional matching slots', async ({ page }) => {
  const { readFile } = await import('node:fs/promises');
  await page.route('**/api/**', route => route.continue({ headers: { ...route.request().headers(), 'x-forwarded-for': '192.0.2.44' } }));
  await page.goto('/admin');
  await page.getByLabel('Parolă de Administrator', { exact: true }).fill('browser-test-admin');
  await page.getByRole('button', { name: 'Autentifică-te', exact: true }).click();
  await page.getByRole('button', { name: 'Evenimente speciale', exact: true }).click();
  await page.getByRole('button', { name: 'Creează eveniment', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const slug = unique();
  await dialog.getByLabel('Nume eveniment', { exact: true }).fill('Sigle optimizate');
  await dialog.getByLabel('Adresă pagină', { exact: true }).fill(slug);
  await dialog.getByLabel('Data și ora (România)', { exact: true }).fill('2090-12-01T19:30');
  await dialog.getByLabel('Eveniment în colaborare', { exact: true }).check();
  await dialog.getByLabel('Nume colaborator', { exact: true }).fill('Colaborator cu siglă mare');
  const input = dialog.getByLabel('Logo colaborator (PNG)', { exact: true });
  const largeFile = await readFile('assets/source/logo-main.png');
  expect(largeFile.length).toBeGreaterThan(1024 * 1024);
  await input.setInputFiles({ name: 'large-original.png', mimeType: 'image/png', buffer: largeFile });
  const preview = dialog.getByTestId('custom-event-logo-preview');
  await expect(preview).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect(dialog.getByRole('button', { name: 'Salvează evenimentul', exact: true })).toBeEnabled();
  const first = Buffer.from((await preview.getAttribute('src'))!.split(',')[1], 'base64');
  expect(first.length).toBeLessThanOrEqual(1024 * 1024);
  expect(first.readUInt32BE(16)).toBeLessThanOrEqual(1024);
  expect(first.readUInt32BE(16)).toBe(first.readUInt32BE(20));

  const oldSource = await preview.getAttribute('src');
  await input.setInputFiles({ name: 'wide-5000px.png', mimeType: 'image/png', buffer: paddedWordmarkPng() });
  await expect(preview).not.toHaveAttribute('src', oldSource!);
  await expect(dialog.getByRole('button', { name: 'Salvează evenimentul', exact: true })).toBeEnabled();
  const pixels = await preview.evaluate(async (image: HTMLImageElement) => {
    await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d', { willReadFrequently: true })!; context.drawImage(image, 0, 0);
    const data = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let left = canvas.width, top = canvas.height, right = -1, bottom = -1, translucent = 0;
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      const alpha = data[(y * canvas.width + x) * 4 + 3];
      if (alpha) { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
      if (alpha > 0 && alpha < 255) translucent++;
    }
    const index = (Math.floor(canvas.height / 2) * canvas.width + Math.floor(canvas.width / 2)) * 4;
    return { width: canvas.width, height: canvas.height, cornerAlpha: data[3], center: Array.from(data.slice(index, index + 4)), left, right, top, bottom, translucent };
  });
  expect(pixels.width).toBe(pixels.height);
  expect(pixels.width).toBeLessThanOrEqual(1024);
  expect(pixels.cornerAlpha).toBe(0);
  expect(pixels.center).toEqual([246, 184, 40, 255]);
  expect(pixels.translucent).toBeGreaterThan(0);
  expect((pixels.right - pixels.left + 1) / (pixels.bottom - pixels.top + 1)).toBeCloseTo(3, 1);
  expect(Math.abs(pixels.left - (pixels.width - 1 - pixels.right))).toBeLessThanOrEqual(2);
  expect(Math.abs(pixels.top - (pixels.height - 1 - pixels.bottom))).toBeLessThanOrEqual(2);
  await dialog.getByLabel('Pagină publicată', { exact: true }).check();
  const response = page.waitForResponse(r => r.url().endsWith('/api/admin/custom-events') && r.request().method() === 'POST');
  await dialog.getByRole('button', { name: 'Salvează evenimentul', exact: true }).click();
  expect((await response).status()).toBe(201);
  await page.goto(`/${slug}`);
  const logos = page.getByTestId('custom-event-logos');
  await expect.poll(() => logos.getByRole('img', { name: 'Colaborator cu siglă mare', exact: true }).evaluate((node: HTMLImageElement) => node.complete && node.naturalWidth > 0)).toBe(true);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await noOverflow(page);
    const sizes = await logos.locator('img').evaluateAll(images => images.map(image => ({ width: image.getBoundingClientRect().width, height: image.getBoundingClientRect().height })));
    expect(Math.abs(sizes[0].width - sizes[1].width)).toBeLessThan(1);
    expect(Math.abs(sizes[0].height - sizes[1].height)).toBeLessThan(1);
    expect(Math.abs(sizes[0].width - sizes[0].height)).toBeLessThan(1);
    await page.locator('header').screenshot({ path: `/private/tmp/processed-logo-${test.info().project.name}-${width}.png` });
  }
});

test('detailed images fit automatically, invalid artwork stays unsaved, and cancelling preparation cannot leak into a new event', async ({ page }) => {
  await page.route('**/api/**', route => route.continue({ headers: { ...route.request().headers(), 'x-forwarded-for': '192.0.2.45' } }));
  await page.goto('/admin');
  await page.getByLabel('Parolă de Administrator', { exact: true }).fill('browser-test-admin');
  await page.getByRole('button', { name: 'Autentifică-te', exact: true }).click();
  await page.getByRole('button', { name: 'Evenimente speciale', exact: true }).click();
  await page.getByRole('button', { name: 'Creează eveniment', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Eveniment în colaborare', { exact: true }).check();
  const input = dialog.getByLabel('Logo colaborator (PNG)', { exact: true });
  await input.setInputFiles({ name: 'detailed.png', mimeType: 'image/png', buffer: detailedPng() });
  const preview = dialog.getByTestId('custom-event-logo-preview');
  await expect(preview).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect(dialog.getByRole('button', { name: 'Salvează evenimentul', exact: true })).toBeEnabled();
  const prepared = Buffer.from((await preview.getAttribute('src'))!.split(',')[1], 'base64');
  expect(prepared.length).toBeLessThanOrEqual(1024 * 1024);
  expect(prepared.readUInt32BE(16)).toBeGreaterThanOrEqual(512);
  expect(prepared.readUInt32BE(16)).toBeLessThan(1024);
  const retained = await preview.getAttribute('src');
  await input.setInputFiles({ name: 'empty.png', mimeType: 'image/png', buffer: pngFromRows(64, 64, Buffer.alloc((64 * 4 + 1) * 64)) });
  await expect(dialog.getByRole('alert')).toHaveText('Logoul nu conține elemente vizibile.');
  await expect(preview).toHaveAttribute('src', retained!);
  await input.setInputFiles({ name: 'not-an-image.png', mimeType: 'image/png', buffer: Buffer.from('not a PNG image') });
  await expect(dialog.getByRole('alert')).toHaveText('Alege o imagine PNG validă.');
  await input.setInputFiles({ name: 'cancel-me.png', mimeType: 'image/png', buffer: detailedPng() });
  await expect(dialog.getByText('Se pregătește logoul…', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'Anulează', exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole('button', { name: 'Creează eveniment', exact: true }).click();
  await dialog.getByLabel('Eveniment în colaborare', { exact: true }).check();
  // Preparing a small source also gives the cancelled older decode time to finish.
  const rows = Buffer.alloc((64 * 4 + 1) * 32);
  for (let y = 8; y < 24; y++) for (let x = 8; x < 56; x++) rows.writeUInt32BE(0x22aa77ff, y * (64 * 4 + 1) + 1 + x * 4);
  await input.setInputFiles({ name: 'small.png', mimeType: 'image/png', buffer: pngFromRows(64, 32, rows) });
  await expect(preview).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect(dialog.getByRole('button', { name: 'Salvează evenimentul', exact: true })).toBeEnabled();
  const small = Buffer.from((await preview.getAttribute('src'))!.split(',')[1], 'base64');
  expect(small.readUInt32BE(16)).toBeLessThanOrEqual(64);
  expect(small.readUInt32BE(16)).toBe(small.readUInt32BE(20));
  await expect(dialog.getByRole('alert')).toHaveCount(0);
});

async function openLogoEditor(page: Page, address: string) {
  await page.route('**/api/**', route => route.continue({ headers: { ...route.request().headers(), 'x-forwarded-for': address } }));
  await page.goto('/admin');
  await page.getByLabel('Parolă de Administrator', { exact: true }).fill('browser-test-admin');
  await page.getByRole('button', { name: 'Autentifică-te', exact: true }).click();
  await page.getByRole('button', { name: 'Evenimente speciale', exact: true }).click();
  await page.getByRole('button', { name: 'Creează eveniment', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Eveniment în colaborare', { exact: true }).check();
  return dialog;
}

test('10660 pixel originals use a bounded working bitmap and preserve transparent artwork', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.createImageBitmap.bind(window);
    const requests: { sourceWidth: number; sourceHeight: number; resizeWidth?: number; resizeHeight?: number; resizeQuality?: string; outputWidth: number; outputHeight: number }[] = [];
    (window as unknown as Record<string, unknown>).__logoRequests = requests;
    window.createImageBitmap = (async (...args: unknown[]) => {
      const bitmap = await Reflect.apply(original, window, args) as ImageBitmap;
      if (args[0] instanceof Blob) {
        const header = new DataView(await args[0].slice(0, 24).arrayBuffer());
        const options = args[1] as ImageBitmapOptions | undefined;
        requests.push({ sourceWidth: header.getUint32(16), sourceHeight: header.getUint32(20),
          resizeWidth: options?.resizeWidth, resizeHeight: options?.resizeHeight, resizeQuality: options?.resizeQuality,
          outputWidth: bitmap.width, outputHeight: bitmap.height });
      }
      return bitmap;
    }) as typeof window.createImageBitmap;
  });
  const dialog = await openLogoEditor(page, '192.0.2.46');
  const source = await hugeLogoPng();
  expect(source.readUInt32BE(16)).toBe(10660);
  expect(source.readUInt32BE(20)).toBe(10660);
  await dialog.getByLabel('Logo colaborator (PNG)', { exact: true }).setInputFiles({ name: 'collaborator-10660.png', mimeType: 'image/png', buffer: source });
  const preview = dialog.getByTestId('custom-event-logo-preview');
  await expect(preview).toHaveAttribute('src', /^data:image\/png;base64,/, { timeout: 20000 });
  await expect(dialog.getByRole('button', { name: 'Salvează evenimentul', exact: true })).toBeEnabled();
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  const requests = await page.evaluate(() => (window as unknown as Record<string, unknown>).__logoRequests);
  expect(requests).toEqual([{ sourceWidth: 10660, sourceHeight: 10660, resizeWidth: 2048, resizeHeight: 2048, resizeQuality: 'high', outputWidth: 2048, outputHeight: 2048 }]);
  const prepared = Buffer.from((await preview.getAttribute('src'))!.split(',')[1], 'base64');
  expect(prepared.length).toBeLessThanOrEqual(1024 * 1024);
  expect(prepared.readUInt32BE(16)).toBe(prepared.readUInt32BE(20));
  expect(prepared.readUInt32BE(16)).toBeLessThanOrEqual(1024);
  const pixels = await preview.evaluate(async (image: HTMLImageElement) => {
    await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const context = canvas.getContext('2d')!; context.drawImage(image, 0, 0);
    return { corner: context.getImageData(0, 0, 1, 1).data[3], center: Array.from(context.getImageData(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1).data) };
  });
  expect(pixels).toEqual({ corner: 0, center: [34, 170, 119, 255] });
});

test('large originals refuse a decoder that ignores resize instead of falling back to an unbounded image', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.createImageBitmap.bind(window), originalURL = URL.createObjectURL.bind(URL);
    const state = { decoderCalls: 0, closed: 0, objectURLs: 0 };
    (window as unknown as Record<string, unknown>).__logoDecodeState = state;
    window.createImageBitmap = (async (...args: unknown[]) => {
      if (!(args[0] instanceof Blob)) return Reflect.apply(original, window, args);
      state.decoderCalls++;
      const canvas = document.createElement('canvas'); canvas.width = 2; canvas.height = 2;
      const bitmap = await original(canvas), close = bitmap.close.bind(bitmap);
      bitmap.close = () => { state.closed++; close(); };
      return bitmap;
    }) as typeof window.createImageBitmap;
    URL.createObjectURL = blob => { state.objectURLs++; return originalURL(blob); };
  });
  const dialog = await openLogoEditor(page, '192.0.2.47');
  await dialog.getByLabel('Logo colaborator (PNG)', { exact: true }).setInputFiles({ name: 'unsupported-10660.png', mimeType: 'image/png', buffer: await hugeLogoPng() });
  await expect(dialog.getByRole('alert')).toHaveText('Browserul nu a putut pregăti acest PNG mare. Încearcă un browser actualizat sau un PNG mai mic.');
  await expect(dialog.getByTestId('custom-event-logo-preview')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__logoDecodeState)).toEqual({ decoderCalls: 1, closed: 1, objectURLs: 0 });
});

test('ordinary logos retain the image fallback when ImageBitmap is unavailable and release their object URL', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'createImageBitmap', { configurable: true, value: undefined });
    const create = URL.createObjectURL.bind(URL), revoke = URL.revokeObjectURL.bind(URL);
    const state = { created: 0, revoked: 0 };
    (window as unknown as Record<string, unknown>).__logoFallback = state;
    URL.createObjectURL = blob => { state.created++; return create(blob); };
    URL.revokeObjectURL = url => { state.revoked++; revoke(url); };
  });
  const dialog = await openLogoEditor(page, '192.0.2.48');
  const rows = Buffer.alloc((64 * 4 + 1) * 32);
  for (let y = 8; y < 24; y++) for (let x = 8; x < 56; x++) rows.writeUInt32BE(0x22aa77ff, y * (64 * 4 + 1) + 1 + x * 4);
  await dialog.getByLabel('Logo colaborator (PNG)', { exact: true }).setInputFiles({ name: 'ordinary.png', mimeType: 'image/png', buffer: pngFromRows(64, 32, rows) });
  const preview = dialog.getByTestId('custom-event-logo-preview');
  await expect(preview).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect(dialog.getByRole('button', { name: 'Salvează evenimentul', exact: true })).toBeEnabled();
  await expect(dialog.getByRole('alert')).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as Record<string, unknown>).__logoFallback)).toEqual({ created: 1, revoked: 1 });
  const prepared = Buffer.from((await preview.getAttribute('src'))!.split(',')[1], 'base64');
  expect(prepared.readUInt32BE(16)).toBe(prepared.readUInt32BE(20));
  expect(prepared.readUInt32BE(16)).toBeLessThanOrEqual(64);
});
