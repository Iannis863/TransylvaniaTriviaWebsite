// Browser tests always use an isolated, empty in-memory application. Never load .env.
for (const key of ['DATABASE_URL', 'POSTGRES_URL', 'NEON_DATABASE_URL', 'POSTGRES_PRISMA_URL', 'RESEND_API_KEY', 'ADMIN_PASSWORD', 'CRON_SECRET', 'VERCEL', 'SEED_DEMO_DATA', 'APP_ORIGIN', 'TRUST_PROXY']) delete process.env[key];
process.env.NODE_ENV = 'test';
const { default: express } = await import('express');
const { createServer } = await import('node:http');
const { setupSecurity, hashPassword } = await import('../server/security.ts');
const { storage, MemStorage } = await import('../server/storage.ts');
const { getCurrentOrNextEdition } = await import('../shared/schedule.ts');
if (!(storage instanceof MemStorage)) throw new Error('Browser tests require in-memory storage');
await storage.setAdminPasswordHash(await hashPassword('browser-test-admin'));
const { registerRoutes } = await import('../server/routes.ts');
const { serveStatic } = await import('../server/static.ts');
const app = express();
setupSecurity(app);
app.use(express.json());
const server = createServer(app);
await registerRoutes(server, app);
app.get('/api/health', (_req, res) => res.json({ status: 'ok', database: 'memory' }));
// Fixtures exist only in this test entry point, never in the production API.
app.post('/__test/reset-code', async (req, res) => {
  const user = await storage.getUserByEmail(req.body.email);
  if (!user) return res.sendStatus(404);
  await storage.createResetCode(user.email, '123456', new Date(Date.now() + 60000), user.id);
  res.json({ ok: true });
});
app.post('/__test/capacity', async (req, res) => {
  const { currentEdition, eventDate } = getCurrentOrNextEdition();
  for (const item of await storage.getRegistrations(currentEdition.id)) await storage.deleteRegistration(item.id);
  await storage.setEditionCapacityOverride(currentEdition.id, 15);
  for (let i = 0; i < (req.body.full ? 15 : 0); i++) await storage.createRegistration({
    editionId: currentEdition.id, eventDate, teamName: `Capacity fixture ${i}`,
    captainName: 'Test captain', email: `capacity${i}@example.test`, memberCount: 4,
  });
  res.json({ ok: true });
});
serveStatic(app);
server.listen(4177, '127.0.0.1', () => console.log('Isolated browser test server: http://127.0.0.1:4177'));
